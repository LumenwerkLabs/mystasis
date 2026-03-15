# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Anamnesis Module** (`src/modules/anamnesis/`)
  - CRUD operations for structured clinical anamnesis (patient interview) records
  - **AnamnesisController** — 7 REST endpoints with role-based access control
    - `POST /anamnesis` — Create anamnesis (CLINICIAN only, clinicianId from JWT)
    - `POST /anamnesis/transcription-token` — Generate single-use ElevenLabs token (CLINICIAN only)
    - `GET /anamnesis/patient/:patientId` — List anamneses for patient (paginated, date-filterable)
    - `GET /anamnesis/:id` — Get single anamnesis (CLINICIAN or own PATIENT)
    - `PATCH /anamnesis/:id` — Update structured fields (CLINICIAN only, patientId/rawTranscript immutable)
    - `DELETE /anamnesis/:id` — Delete anamnesis (CLINICIAN only)
  - **AnamnesisService** — Business logic with PHI-aware validation
    - Patient existence validation before record creation
    - ElevenLabs transcription token generation with sanitized error handling
    - Audit logging with clinician ID for all token requests
  - **DTOs** — Full validation with class-validator
    - `CreateAnamnesisDto` — All structured fields (chief complaint, HPI, medical history, medications, allergies, family/social history, review of systems)
    - `UpdateAnamnesisDto` — Partial updates (immutable fields excluded)
    - `GetAnamnesisQueryDto` — Pagination + date range filtering
  - **Prisma Schema** — `Anamnesis` model with UUID primary key, relations to User (patient + clinician), composite indexes on (patientId, recordedAt)
  - **Access Control** — Patients can only view their own anamneses; clinicians have full CRUD

- **ElevenLabs Transcription Token Integration**
  - **Configuration** (`src/config/elevenlabs.config.ts`)
    - `ELEVENLABS_API_KEY` — API key (optional; feature disabled if absent)
    - `ELEVENLABS_API_URL` — Base URL (default: `https://api.elevenlabs.io`)
    - HTTPS enforcement for non-localhost URLs
    - Whitespace trimming on both values
  - **Token Generation** — Server-side single-use token flow
    - Backend holds real API key, generates temporary tokens via `POST /v1/single-use-token/realtime_scribe`
    - Client receives short-lived token (15 min expiry, consumed on first WebSocket connection)
    - API key never sent to client — only temporary tokens
  - **Injection Token Pattern** (`anamnesis.constants.ts`)
    - `HTTP_SERVICE_TOKEN` for HttpService dependency injection, matching LlmModule pattern
    - Enables isolated unit testing with mocked HTTP service
  - Registered `elevenlabsConfig` in global `ConfigModule`

### Security

- **Anamnesis Token Endpoint Hardening**
  - Sanitized error messages — raw ElevenLabs HTTP errors never exposed to clients
  - 10-second timeout on outbound ElevenLabs requests
  - Response structure validation — rejects unexpected token formats
  - Audit logging with clinician ID for all token generation requests
  - 503 response when ElevenLabs is not configured (graceful feature gating)

- **OpenMed PII De-identification Module** (Phase 1)
  - HIPAA-compliant de-identification of clinical notes before sending to LLM APIs
  - **Python Microservice** (`openmed-service/`)
    - FastAPI service wrapping OpenMed library for medical NER
    - Endpoints: `POST /deidentify`, `POST /extract-pii`, `GET /health`
    - 5 de-identification methods: `mask`, `remove`, `replace`, `hash`, `shift_dates`
    - Thread-safe model loading with double-check locking pattern
    - Rate limiting: 100 requests/minute per IP
    - API key authentication for service-to-service communication
    - 1MB text size limit for safety
  - **NestJS Module** (`src/modules/openmed/`)
    - `OpenMedService` - HTTP client to Python microservice with retry logic
    - `DeidentifyRequestDto` / `DeidentifyResponseDto` - Validated DTOs
    - Graceful degradation with fail-secure behavior (throws error vs passthrough)
    - HIPAA-compliant structured audit logging (userId, requestId, timestamp)
  - **Configuration** (`src/config/openmed.config.ts`)
    - `OPENMED_SERVICE_URL` - Microservice URL (default: `http://localhost:8001`)
    - `OPENMED_API_KEY` - API key for authentication
    - `OPENMED_TIMEOUT` - Request timeout (default: 30000ms)
    - `OPENMED_CONFIDENCE_THRESHOLD` - PII detection threshold (default: 0.7)
    - `OPENMED_ENABLED` - Enable/disable feature (default: true)
    - `OPENMED_ALLOW_PASSTHROUGH` - Allow passthrough when service unavailable (default: false in production)
  - **LLM Service Integration**
    - `deidentifyClinicalNotes(text, userId?)` - De-identify clinical notes with audit trail
    - `buildUserPromptWithClinicalNotes(biomarkers, notes, userId?)` - Build prompts with safe notes
    - Clinical notes excluded from LLM prompts when de-identification fails (fail-secure)
  - **Docker Compose** - Added `openmed` service with internal network, health checks, resource limits
  - **Test Coverage** - 173 tests total (145 OpenMed + 25 LLM service + 3 DTO)

- **CookieService** (`src/common/services/cookie.service.ts`)
  - Reusable service for managing HttpOnly authentication cookies
  - Centralizes cookie configuration for security consistency across modules
  - `setAuthCookie()`: Sets JWT token as HttpOnly cookie with security settings
  - `clearAuthCookie()`: Clears authentication cookie for logout
  - Security features:
    - `httpOnly: true` - Prevents JavaScript access (XSS protection)
    - `secure: true` in production (HTTPS only)
    - `sameSite: 'strict'` (CSRF protection)
    - Configurable max age via `auth.cookieMaxAge` config
  - Exported from global `CommonModule` for use across all modules

- **CommonModule** (`src/common/common.module.ts`)
  - Global module providing shared services across the application
  - Marked as `@Global()` so exports are available everywhere without explicit imports
  - Currently provides: CookieService

- **Users Controller** (`src/modules/users/users.controller.ts`)
  - REST endpoints for user profile management with role-based access control
  - `GET /users` - List users in clinic (CLINICIAN only, paginated)
  - `GET /users/:id` - Get user profile by ID
  - `PATCH /users/:id` - Update user profile
  - `DELETE /users/:id` - Delete user account
  - Access control:
    - PATIENT: can only access their own profile
    - CLINICIAN: can access patients in their clinic
  - Protected by `JwtAuthGuard` and `RolesGuard`
  - Full Swagger/OpenAPI documentation

- **Users DTOs** (`src/modules/users/dto/`)
  - `UpdateUserDto` - Partial update with firstName, lastName, password validation
  - `GetUsersQueryDto` - Pagination (page, limit) and role filter for user listing
  - `UserResponseDto` - User data response without password field
  - `PaginatedUsersResponseDto` - Paginated response with total count and metadata

- **Docker Deployment Configuration**
  - `Dockerfile` - Multi-stage build for optimized production images
    - Stage 1 (deps): Install dependencies and generate Prisma client
    - Stage 2 (builder): Build TypeScript application
    - Stage 3 (production): Minimal runtime image with non-root user
    - Health check endpoint integration (`/health/live`)
    - Automatic database migrations on startup
  - `docker-compose.yml` - Main orchestration file
    - TimescaleDB (PostgreSQL with time-series extensions) database service
    - NestJS API service with health checks
    - Configurable via environment variables
  - `docker-compose.dev.yml` - Development override
    - Hot reload with source code mounting
    - Debug port exposed (9229)
    - Disabled health check for faster startup
  - `docker-compose.prod.yml` - Production override
    - Resource limits (CPU, memory)
    - Logging configuration with rotation
    - Database port not exposed externally
  - `.dockerignore` - Optimized build context

- **Clinic Management with Multi-Tenancy**
  - `Clinic` model added to database schema (`prisma/schema.prisma`)
    - Fields: id (UUID), name, address, phone, timestamps
    - One-to-many relationship with User (patients and clinicians belong to clinics)
  - `clinicId` field added to User model for tenant isolation
  - **ClinicsModule** (`src/modules/clinics/`)
    - Full CRUD operations for clinic management
    - Patient enrollment and unenrollment endpoints
    - Clinic ownership validation for all sensitive operations
  - **ClinicsController** (`src/modules/clinics/clinics.controller.ts`)
    - `POST /clinics` - Create a new clinic (CLINICIAN only)
      - Returns new JWT token with updated `clinicId` in response body
      - Automatically sets new HttpOnly cookie for web clients
      - Mobile clients should replace stored token with `accessToken` from response
    - `GET /clinics` - List clinician's own clinic (prevents enumeration)
    - `GET /clinics/:id` - Get clinic by ID (owner only)
    - `PATCH /clinics/:id` - Update clinic (owner only)
    - `DELETE /clinics/:id` - Delete clinic (owner only)
    - `POST /clinics/:clinicId/patients/:patientId` - Enroll patient (owner only)
      - **Note:** Patient must re-login to receive updated token with new `clinicId`
    - `DELETE /clinics/:clinicId/patients/:patientId` - Unenroll patient (owner only)
      - **Note:** Patient must re-login to receive updated token without `clinicId`
    - `GET /clinics/:clinicId/patients` - List patients in clinic (owner only)
  - **ClinicsService** (`src/modules/clinics/clinics.service.ts`)
    - Clinic CRUD with ownership validation
    - Patient enrollment with conflict detection (already enrolled elsewhere)
    - Safe user responses (password excluded from all patient data)
  - **Multi-tenant filtering** in analytics module
    - Cohort analytics scoped to clinician's clinic
    - Prevents cross-clinic data access
  - **Clinic access validation** throughout the application
    - Clinicians can only access their own clinic's data
    - Patients can only be enrolled in one clinic at a time

- **AnalyticsController** (`src/modules/analytics/analytics.controller.ts`)
  - 4 REST endpoints for clinic-level cohort analytics
  - `GET /analytics/cohort/:clinicId/summary` - Cohort summary statistics (patient counts, active patients, alerts)
  - `GET /analytics/cohort/:clinicId/risk-distribution` - Patient risk level distribution (LOW, MEDIUM, HIGH, CRITICAL)
  - `GET /analytics/cohort/:clinicId/alerts` - Alert statistics with status/severity breakdowns and average resolution time
  - `GET /analytics/cohort/:clinicId/trends/:type` - Population biomarker trend analysis with daily data points
  - CLINICIAN-only access control via `@Roles(UserRole.CLINICIAN)` decorator
  - Protected by `JwtAuthGuard` and `RolesGuard`
  - Date range filtering with validation (max 365 days)
  - Privacy protections: aggregated data only, sample size suppression for min/max values below threshold (5)

- **AnalyticsService** (`src/modules/analytics/analytics.service.ts`)
  - Population-level data aggregation with privacy-preserving statistics
  - Risk distribution calculation based on highest severity active alert per patient
  - Alert statistics with status and severity breakdowns
  - Average resolution time calculation for resolved alerts
  - Biomarker trend analysis with daily aggregation and trend direction detection
  - Sample size suppression to prevent re-identification (min/max hidden when n < 5)

- **Analytics DTOs** (`src/modules/analytics/dto/`)
  - `CohortSummaryDto` - Cohort statistics with age distribution
  - `RiskDistributionDto` - Patient counts by risk level
  - `AlertStatisticsDto` - Alert counts by status and severity
  - `TrendSummaryDto` - Population biomarker trends with daily data points
  - `GetAnalyticsQueryDto` - Query parameters with date range validation

- **AlertsController** (`src/modules/alerts/alerts.controller.ts`)
  - 7 REST endpoints for managing health alerts
  - `GET /alerts/:userId` - Get paginated alerts with status/severity filtering
  - `GET /alerts/:userId/active` - Get all active alerts for a user
  - `GET /alerts/detail/:id` - Get a single alert by ID
  - `POST /alerts` - Create a new alert (CLINICIAN only)
  - `PATCH /alerts/:id/acknowledge` - Acknowledge an alert
  - `PATCH /alerts/:id/dismiss` - Dismiss an alert
  - `PATCH /alerts/:id/resolve` - Resolve an alert (CLINICIAN only)
  - Role-based access control: PATIENT can access own alerts, CLINICIAN has full access
  - Protected by `JwtAuthGuard` and `RolesGuard`
  - 85 TDD test cases for comprehensive coverage

- **CreateAlertDto** (`src/modules/alerts/dto/create-alert.dto.ts`)
  - Request DTO for alert creation
  - Validates userId (UUID), type (BiomarkerType), severity (AlertSeverity)
  - Title (1-200 chars), message (1-2000 chars)
  - Optional value and threshold fields (0-1,000,000)

- **GetAlertsQueryDto** (`src/modules/alerts/dto/get-alerts-query.dto.ts`)
  - Query parameters DTO for alert listing
  - Optional status filter (AlertStatus enum)
  - Optional severity filter (AlertSeverity enum)
  - Pagination: page (default 1), limit (1-100, default 10)

- **CurrentUser Parameter Decorator** (`src/common/decorators/current-user.decorator.ts`)
  - Extracts authenticated user from request object
  - Works with JwtAuthGuard to access JWT payload
  - Type-safe user extraction for controller method parameters

- **UserPayload Interface** (`src/common/interfaces/user-payload.interface.ts`)
  - Shared interface for JWT token payload structure
  - Ensures consistency between JwtAuthGuard and controllers
  - Documents JWT claims: `sub` (user ID), `email`, `role`, optional `firstName`/`lastName`

- **LlmController** (`src/modules/llm/llm.controller.ts`)
  - `POST /llm/summary/:userId` - Generate health summary (CLINICIAN only)
    - Accepts `CreateSummaryDto` with `summaryType` enum
    - Validates UUID format on `userId` parameter
  - `GET /llm/nudge/:userId` - Get wellness nudge (PATIENT only, own data)
    - Validates that patient can only access their own nudges
    - Returns personalized wellness message with disclaimer
  - Protected by `JwtAuthGuard` and `RolesGuard`

- **CreateSummaryDto** (`src/modules/llm/dto/create-summary.dto.ts`)
  - Request DTO for health summary generation
  - Validates `summaryType` is valid `SummaryType` enum value
  - Uses `class-validator` decorators (`@IsNotEmpty`, `@IsEnum`)

- **LlmModule** (`src/modules/llm/llm.module.ts`)
  - Wires together HttpModule, HealthDataModule, LlmService, LlmController
  - Exports LlmService for use by other modules
  - Uses custom HTTP_SERVICE_TOKEN for dependency injection

- **Authentication & Authorization**
  - `JwtAuthGuard` (`src/common/guards/jwt-auth.guard.ts`)
    - JWT Bearer token authentication for protected routes
    - Extracts token from Authorization header (case-insensitive Bearer prefix)
    - Verifies token using injectable JWT service (flexible DI pattern)
    - Attaches decoded payload to `request.user` for downstream handlers
    - Proper error handling with `UnauthorizedException` for auth failures
  - `RolesGuard` (`src/common/guards/roles.guard.ts`)
    - Role-based access control (RBAC) for endpoint authorization
    - Works with `@Roles()` decorator to restrict access by user role
    - Supports multiple roles (OR logic - user needs any one of the specified roles)
    - Handler-level decorators take precedence over class-level
    - Throws `ForbiddenException` for unauthorized access attempts
  - `@Roles()` Decorator (`src/common/decorators/roles.decorator.ts`)
    - Declarative role requirements for routes and controllers
    - Supports single or multiple `UserRole` values
    - Integrates with `RolesGuard` via NestJS Reflector metadata

- **LLM Integration** (`src/modules/llm/llm.service.ts`)
  - `LlmService` for generating health insights using LLMs
  - `generateSummary()`: Creates personalized health summaries from biomarker data
    - Supports PATIENT_SUMMARY and CLINICIAN_REPORT types
    - Uses 30-day biomarker trend window for analysis
    - Saves generated summaries to database for audit trail
  - `generateNudge()`: Creates motivational wellness nudges for patients
    - Uses 7-day biomarker trend window
    - Focuses on general wellness (sleep, exercise, hydration)
  - **Medical Safety Features:**
    - Content sanitization removes diagnosis language (e.g., "you have diabetes")
    - Content sanitization removes medication advice (e.g., "take 500mg")
    - All responses include mandatory healthcare disclaimer
    - Prompts explicitly prohibit prescriptive medical advice
    - Graceful degradation with fallback content on LLM failures
  - Structured data extraction (flags, recommendations, questions for doctor)
  - Comprehensive error logging for debugging and audit

- **Database Layer (Prisma/PostgreSQL)**
  - Prisma ORM integration with PostgreSQL
  - Database schema with comprehensive models (User, BiomarkerValue, Alert, LLMSummary)
  - Comprehensive indexes for query performance (userId, timestamp, type)
  - Migration support via `prisma migrate dev`

- **UsersService** (`src/modules/users/users.service.ts`)
  - `create()`: Create user with bcrypt password hashing (10 rounds)
  - `findAll()`: List users with optional role filter
  - `findOne()`: Get user by ID with NotFoundException handling
  - `findByEmail()`: Get user by email for authentication (includes password)
  - `update()`: Update user fields with automatic password re-hashing
  - `remove()`: Delete user with CASCADE to related records
  - Password excluded from all API responses via `excludePassword()` helper

- **HealthDataService** (`src/modules/health-data/health-data.service.ts`)
  - `create()`: Create single biomarker value with user validation
  - `createMany()`: Batch create biomarkers for wearable device sync
  - `findAll()`: Paginated list with type and date range filters
  - `findLatest()`: Get most recent value by biomarker type
  - `getTrend()`: Get values in date range for trend analysis (ascending order)
  - `remove()`: Delete biomarker value by ID
  - Support for 30+ biomarker types (cardiovascular, metabolic, fitness, etc.)

- **AlertsService** (`src/modules/alerts/alerts.service.ts`)
  - `create()`: Create alert with ACTIVE status and user validation
  - `findAll()`: List alerts with status/severity filters and pagination
  - `findOne()`: Get alert by ID
  - `updateStatus()`: Update alert status directly
  - `acknowledge()`: Mark alert as ACKNOWLEDGED
  - `dismiss()`: Mark alert as DISMISSED
  - `resolve()`: Mark alert as RESOLVED
  - `getActiveAlerts()`: Get all active alerts for a user
  - Severity levels: LOW, MEDIUM, HIGH, CRITICAL

- **PrismaExceptionFilter** (`src/common/filters/prisma-exception.filter.ts`)
  - Global exception filter for Prisma errors
  - Error code mappings:
    - P2002 (unique constraint violation) -> 409 Conflict
    - P2025 (record not found) -> 404 Not Found
    - P2003 (foreign key constraint violation) -> 400 Bad Request
    - PrismaClientValidationError -> 400 Bad Request
    - PrismaClientInitializationError -> 503 Service Unavailable
  - Consistent error response format with timestamp and path

- **Module Configuration**
  - `UsersModule`: User management with PrismaModule dependency
  - `HealthDataModule`: Biomarker data management with PrismaModule dependency
  - `AlertsModule`: Alert management with PrismaModule dependency
  - `PrismaModule`: Global database access layer
  - PrismaExceptionFilter registered globally in `main.ts`

- **Database Schema** (`prisma/schema.prisma`)
  - `User` model: id, email (unique), password, firstName, lastName, role, timestamps
  - `BiomarkerValue` model: id, userId, type, value, unit, timestamp, source, metadata
  - `Alert` model: id, userId, type, severity, status, title, message, value, threshold
  - `LLMSummary` model: id, userId, type, content, structuredData, audienceRole, modelVersion
  - Enums: UserRole, BiomarkerType (30+ types), AlertSeverity, AlertStatus, SummaryType
  - CASCADE delete on user relations
  - Composite index on (userId, type, timestamp) for efficient biomarker queries

### Security

- **OpenMed PII De-identification Security**
  - HTTPS enforcement in production for microservice communication
  - API key authentication between NestJS and Python microservice
  - Rate limiting: 100 requests/minute per IP to prevent abuse
  - No PHI in response DTOs by default (`includeOriginalText: false`)
  - Fail-secure design: throws error instead of passing through PHI in production
  - Structured HIPAA audit logs with userId, requestId, timestamp for compliance
  - 1MB text size limit to prevent denial of service

- **JWT Token Refresh Behavior**
  - JWT tokens contain user data: `sub` (user ID), `email`, `role`, `clinicId`
  - When JWT-embedded data changes, token refresh is required:
    - **Clinic creation:** Token automatically refreshed via response + HttpOnly cookie
    - **Role change (admin action):** User must re-login to receive updated token
    - **Patient enrollment/unenrollment:** Patient must re-login to receive updated token
  - This stateless JWT approach:
    - Avoids database queries on every authenticated request
    - Provides better performance and scalability
    - Requires re-authentication when embedded data changes (by design)

- **HttpOnly Cookie Authentication**
  - Web clients receive JWT via HttpOnly cookie (immune to XSS attacks)
  - Mobile clients receive JWT in response body (stored in secure storage)
  - Cookie settings:
    - `httpOnly: true` - JavaScript cannot access token
    - `secure: true` in production - HTTPS only
    - `sameSite: 'strict'` - CSRF protection
    - 7-day expiration (configurable via `auth.cookieMaxAge`)

- **Rate Limiting** (`@nestjs/throttler`)
  - Global rate limit: 10 requests per 60 seconds (default)
  - Login endpoint: 5 requests per 60 seconds (prevents brute force attacks)
  - Registration endpoint: 3 requests per hour (prevents mass account creation)
  - Custom `@Throttle` decorator combines metadata for testing with runtime enforcement
  - ThrottlerGuard enabled globally via APP_GUARD provider

- **Helmet Middleware** (`src/main.ts`)
  - Security headers enabled via `helmet()` middleware
  - Protects against common web vulnerabilities (XSS, clickjacking, MIME sniffing)

- **CORS Policy** (`src/main.ts`)
  - Restrictive CORS configuration with explicit origin whitelist
  - Production enforcement: CORS_ORIGIN environment variable required
  - Allowed methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
  - Credentials enabled for cookie-based authentication

- **Authentication Event Logging** (`src/modules/auth/auth.service.ts`)
  - Failed login attempts logged with email for security monitoring
  - Successful logins and registrations logged for audit trail
  - Generic error messages to prevent user enumeration

- **Global ValidationPipe** (`src/main.ts`)
  - Enabled globally for automatic DTO validation
  - `whitelist: true` - Strips unknown properties from request bodies
  - `forbidNonWhitelisted: true` - Throws error on unknown properties
  - `transform: true` - Auto-transforms payloads to DTO class instances

- **ParseUUIDPipe Validation**
  - Applied to route parameters (`userId`) in LlmController
  - Validates that path parameters are valid UUID v4 format
  - Returns 400 Bad Request for malformed UUIDs

- Passwords hashed with bcrypt (10 salt rounds)
- Passwords excluded from all API responses using type-safe helper
- User existence validated before creating related records (biomarkers, alerts)
- Race condition prevention in user creation (catches P2002 vs check-then-create)
- Email uniqueness enforced at database level

### Changed

- Moved schema.prisma to standard Prisma location (`prisma/schema.prisma`)
- Updated architecture diagram in CLAUDE.md to reflect actual structure

### Infrastructure

- Health check endpoints: `/health`, `/health/live`, `/health/ready`
- Database health indicator for readiness probes
- Environment-based configuration via `@nestjs/config`
