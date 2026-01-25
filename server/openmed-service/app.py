"""OpenMed PII De-identification Microservice.

This FastAPI microservice provides HIPAA-compliant PII detection and
de-identification for clinical text, enabling safe processing of
patient notes before sending to LLM APIs.

Security features:
- API key authentication via X-API-Key header (configurable)
- Rate limiting per IP address
- Input size validation

Usage:
    uvicorn app:app --host 0.0.0.0 --port 8001
"""

import logging
import os
import threading
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Maximum text length to prevent DoS via large payloads (1MB)
MAX_TEXT_LENGTH = 1_000_000

# Rate limiting configuration
RATE_LIMIT_REQUESTS = 100  # Max requests per window
RATE_LIMIT_WINDOW_SECONDS = 60  # Window size in seconds

# API key authentication
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
EXPECTED_API_KEY = os.environ.get("OPENMED_API_KEY")

# Thread-safe lazy loading for OpenMed
_openmed_loaded = False
_openmed_lock = threading.Lock()

# Simple in-memory rate limiting storage
# Structure: {ip_address: [(timestamp1, timestamp2, ...)]}
_rate_limit_storage: dict[str, list[float]] = defaultdict(list)
_rate_limit_lock = threading.Lock()


def _get_client_ip(request: Request) -> str:
    """Extract client IP from request, handling proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Take the first IP in the chain (original client)
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(ip: str) -> bool:
    """Check if IP has exceeded rate limit. Returns True if allowed."""
    current_time = time.time()
    window_start = current_time - RATE_LIMIT_WINDOW_SECONDS

    with _rate_limit_lock:
        # Clean up old entries
        _rate_limit_storage[ip] = [
            ts for ts in _rate_limit_storage[ip] if ts > window_start
        ]

        # Check if under limit
        if len(_rate_limit_storage[ip]) >= RATE_LIMIT_REQUESTS:
            return False

        # Record this request
        _rate_limit_storage[ip].append(current_time)
        return True


async def verify_api_key(
    request: Request, api_key: Optional[str] = Depends(API_KEY_HEADER)
) -> None:
    """Verify API key if configured, and check rate limits.

    If OPENMED_API_KEY env var is not set, authentication is skipped
    (development mode) but a warning is logged.
    """
    client_ip = _get_client_ip(request)

    # Check rate limit first
    if not _check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
        )

    # Check API key if configured
    if EXPECTED_API_KEY:
        if not api_key:
            logger.warning(f"Missing API key from IP: {client_ip}")
            raise HTTPException(
                status_code=401,
                detail="Missing API key. Provide X-API-Key header.",
            )
        if api_key != EXPECTED_API_KEY:
            logger.warning(f"Invalid API key from IP: {client_ip}")
            raise HTTPException(
                status_code=401,
                detail="Invalid API key.",
            )
    else:
        # Log warning once on startup (handled in lifespan)
        pass


def _ensure_openmed():
    """Lazy-load OpenMed on first request with thread-safe double-check pattern."""
    global _openmed_loaded
    if _openmed_loaded:
        return
    with _openmed_lock:
        # Double-check after acquiring lock
        if not _openmed_loaded:
            logger.info("Loading OpenMed PII model...")
            # Import triggers model download/loading
            import openmed  # noqa: F401

            _openmed_loaded = True
            logger.info("OpenMed PII model loaded successfully")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup/shutdown events."""
    # Security warning if API key not configured
    if not EXPECTED_API_KEY:
        logger.warning(
            "SECURITY WARNING: OPENMED_API_KEY not set. "
            "API key authentication is disabled. "
            "This is acceptable for development but NOT recommended for production."
        )

    # Startup: Optionally preload model
    preload = os.environ.get("OPENMED_PRELOAD", "false").lower() == "true"
    if preload:
        logger.info("Preloading OpenMed model...")
        _ensure_openmed()
    yield
    # Shutdown: cleanup if needed (currently none required)


app = FastAPI(
    title="OpenMed PII Service",
    description="""
## HIPAA-Compliant PII Detection and De-identification

This microservice provides medical Named Entity Recognition (NER) for detecting and
redacting Protected Health Information (PHI) from clinical text.

### Features
- **5 De-identification Methods**: mask, remove, replace, hash, shift_dates
- **HIPAA Safe Harbor Compliance**: Detects all 18 identifier types
- **High Accuracy**: Uses OpenMed's medical NER models
- **Rate Limited**: 100 requests/minute per IP

### Authentication
Requires `X-API-Key` header when `OPENMED_API_KEY` environment variable is set.

### Integration
This service is called internally by the Mystasis NestJS backend.
It should not be exposed directly to external clients.
    """,
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=[
        {
            "name": "De-identification",
            "description": "De-identify clinical text by detecting and redacting PII",
        },
        {
            "name": "Extraction",
            "description": "Extract PII entities without de-identification (for auditing)",
        },
        {
            "name": "Health",
            "description": "Service health checks",
        },
    ],
    docs_url="/docs",
    redoc_url="/redoc",
)


# ============================================
# Request/Response Models
# ============================================


class PIIEntity(BaseModel):
    """Detected PII entity."""

    text: str = Field(..., description="The detected PII text")
    label: str = Field(..., description="PII category (NAME, EMAIL, PHONE, etc.)")
    entity_type: str = Field(..., description="PII category (same as label)")
    start: int = Field(..., description="Character start position")
    end: int = Field(..., description="Character end position")
    confidence: float = Field(..., description="Detection confidence (0-1)")
    redacted_text: Optional[str] = Field(
        None, description="Replacement text after de-identification"
    )


class DeidentifyRequest(BaseModel):
    """Request to de-identify clinical text."""

    text: str = Field(
        ...,
        description="Clinical text to de-identify",
        min_length=1,
        max_length=MAX_TEXT_LENGTH,
    )
    method: Literal["mask", "remove", "replace", "hash", "shift_dates"] = Field(
        "mask", description="De-identification method"
    )
    confidence_threshold: float = Field(
        0.7,
        ge=0.0,
        le=1.0,
        description="Minimum confidence for PII detection (higher = fewer false positives)",
    )
    model_name: str = Field(
        "OpenMed/OpenMed-PII-SuperClinical-Small-44M-v1",
        description="OpenMed PII model to use",
    )
    use_smart_merging: bool = Field(
        True, description="Enable semantic unit merging for fragmented entities"
    )
    keep_year: bool = Field(True, description="Keep year in dates when using mask")


class DeidentifyResponse(BaseModel):
    """Response from de-identification."""

    original_text: str = Field(..., description="Original input text")
    deidentified_text: str = Field(..., description="Text with PII redacted")
    pii_entities: list[PIIEntity] = Field(
        ..., description="List of detected PII entities"
    )
    method: str = Field(..., description="De-identification method used")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    num_entities_redacted: int = Field(..., description="Number of PII entities found")


class ExtractPIIRequest(BaseModel):
    """Request to extract PII entities without de-identification."""

    text: str = Field(
        ...,
        description="Clinical text to analyze",
        min_length=1,
        max_length=MAX_TEXT_LENGTH,
    )
    confidence_threshold: float = Field(
        0.5, ge=0.0, le=1.0, description="Minimum confidence for PII detection"
    )
    model_name: str = Field(
        "OpenMed/OpenMed-PII-SuperClinical-Small-44M-v1",
        description="OpenMed PII model to use",
    )
    use_smart_merging: bool = Field(
        True, description="Enable semantic unit merging"
    )


class ExtractPIIResponse(BaseModel):
    """Response from PII extraction."""

    text: str = Field(..., description="Original input text")
    entities: list[PIIEntity] = Field(..., description="Detected PII entities")
    num_entities: int = Field(..., description="Number of entities found")
    model_name: str = Field(..., description="Model used for detection")


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    openmed_loaded: bool
    timestamp: str


# ============================================
# Endpoints
# ============================================


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint.

    Note: Health check does not require authentication to allow
    orchestration tools (Kubernetes, Docker) to monitor service health.
    """
    return HealthResponse(
        status="healthy",
        openmed_loaded=_openmed_loaded,
        timestamp=datetime.now().isoformat(),
    )


@app.post("/deidentify", response_model=DeidentifyResponse, dependencies=[Depends(verify_api_key)], tags=["De-identification"])
async def deidentify_text(request: DeidentifyRequest):
    """De-identify clinical text by detecting and redacting PII.

    Implements multiple de-identification strategies for HIPAA compliance:
    - mask: Replace with [NAME], [EMAIL], etc.
    - remove: Remove PII entirely
    - replace: Replace with fake but realistic data
    - hash: Replace with consistent hash for entity linking
    - shift_dates: Shift dates by random offset
    """
    try:
        _ensure_openmed()
        from openmed import deidentify

        result = deidentify(
            text=request.text,
            method=request.method,
            model_name=request.model_name,
            confidence_threshold=request.confidence_threshold,
            use_smart_merging=request.use_smart_merging,
            keep_year=request.keep_year,
        )

        # Convert to response format
        pii_entities = [
            PIIEntity(
                text=e.text,
                label=e.label,
                entity_type=e.entity_type,
                start=e.start,
                end=e.end,
                confidence=e.confidence,
                redacted_text=e.redacted_text,
            )
            for e in result.pii_entities
        ]

        return DeidentifyResponse(
            original_text=result.original_text,
            deidentified_text=result.deidentified_text,
            pii_entities=pii_entities,
            method=result.method,
            timestamp=result.timestamp.isoformat(),
            num_entities_redacted=len(pii_entities),
        )

    except ImportError as e:
        logger.error(f"OpenMed import error: {e}")
        raise HTTPException(
            status_code=503,
            detail="OpenMed library not available. Please contact support.",
        )
    except Exception as e:
        # Log full error details internally, return generic message to client
        logger.error(f"De-identification error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail="De-identification failed. Please try again later.",
        )


@app.post("/extract-pii", response_model=ExtractPIIResponse, dependencies=[Depends(verify_api_key)], tags=["Extraction"])
async def extract_pii(request: ExtractPIIRequest):
    """Extract PII entities from text without de-identification.

    Useful for auditing and understanding what PII is present
    before deciding on de-identification strategy.
    """
    try:
        _ensure_openmed()
        from openmed import extract_pii as openmed_extract_pii

        result = openmed_extract_pii(
            text=request.text,
            model_name=request.model_name,
            confidence_threshold=request.confidence_threshold,
            use_smart_merging=request.use_smart_merging,
        )

        entities = [
            PIIEntity(
                text=e.text,
                label=e.label,
                entity_type=e.label,
                start=e.start,
                end=e.end,
                confidence=e.confidence,
                redacted_text=None,
            )
            for e in result.entities
        ]

        return ExtractPIIResponse(
            text=result.text,
            entities=entities,
            num_entities=len(entities),
            model_name=request.model_name,
        )

    except ImportError as e:
        logger.error(f"OpenMed import error: {e}")
        raise HTTPException(
            status_code=503,
            detail="OpenMed library not available. Please contact support.",
        )
    except Exception as e:
        # Log full error details internally, return generic message to client
        logger.error(f"PII extraction error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail="PII extraction failed. Please try again later.",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
