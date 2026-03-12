# Mystasis Backend — CLAUDE.md

> **Location:** This file should be placed at `./server/CLAUDE.md`

## Project Identity

**Name:** mystasis-backend  
**Path:** `./server/` (relative to project root)  
**Stack:** NestJS + TypeScript + Prisma + PostgreSQL/TimescaleDB  
**Purpose:** Longevity-focused health platform backend that consolidates wearable data, lab results, and clinical information, then uses health-tuned LLMs to generate safe insights for patients and clinicians.

---

## Quick Reference

| Action | Command |
|--------|---------|
| Install dependencies | `cd server && npm install` |
| Run development | `cd server && npm run start:dev` |
| Run tests | `cd server && npm test` |
| Run e2e tests | `cd server && npm run test:e2e` |
| Lint code | `cd server && npm run lint` |
| Format code | `cd server && npm run format` |
| Generate Prisma client | `cd server && npx prisma generate` |
| Run migrations | `cd server && npx prisma migrate dev` |
| Seed database | `cd server && npx prisma db seed` |
| Build for production | `cd server && npm run build` |
| View API docs | Open `http://localhost:3000/api/docs` |
| View OpenMed docs | Open `http://localhost:8001/docs` |

### Docker Commands

| Action | Command |
|--------|---------|
| Start (production) | `docker-compose up -d` |
| Start (development) | `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d` |
| View logs | `docker-compose logs -f api` |
| Stop services | `docker-compose down` |
| Reset database | `docker-compose down -v` |
| Build image | `docker-compose build` |
| Run migrations | `docker-compose exec api npx prisma migrate deploy` |

---

## Architecture Overview

```
server/
├── prisma/
│   ├── schema.prisma              # Prisma schema (models, enums, relations)
│   └── seed.ts                    # Idempotent seed script (demo clinic, users, biomarkers)
├── src/
│   ├── main.ts                    # Bootstrap, global filters/pipes/interceptors
│   ├── app.module.ts              # Root module wiring
│   ├── config/                    # Centralized configuration
│   ├── core/
│   │   └── prisma/                # Database access layer
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   ├── common/                    # Shared utilities
│   │   ├── common.module.ts       # Global module for shared services
│   │   ├── dto/                   # Shared DTOs (BiomarkerDto, UserDto, etc.)
│   │   ├── decorators/            # @ClinicianOnly(), @CurrentUser()
│   │   ├── guards/                # JWT auth, role-based guards
│   │   ├── pipes/                 # UserByIdPipe, ParseBiomarkerPipe, ValidateFilePipe
│   │   ├── filters/               # Exception filters (Prisma errors, LLM timeouts)
│   │   ├── interceptors/          # Logging, response shaping, rate limiting
│   │   ├── interfaces/            # Shared TypeScript interfaces
│   │   └── services/              # Shared services (CookieService)
│   └── modules/
│       ├── auth/                  # Authentication & JWT
│       ├── users/                 # User profiles and roles
│       ├── health-data/           # Wearable sync, lab uploads, biomarker trends
│       ├── alerts/                # Health alerts from biomarker threshold violations
│       ├── llm/                   # LLM summaries and nudges
│       ├── openmed/               # PII de-identification for clinical notes
│       ├── analytics/             # Cohort-level insights for clinics
│       ├── clinics/               # Clinic management and multi-tenancy
│       └── health/                # Health checks (/health, /live, /ready)
├── openmed-service/               # Python microservice for OpenMed NER
│   ├── main.py                    # FastAPI application
│   ├── requirements.txt           # Python dependencies
│   └── Dockerfile                 # Container definition
├── test/                          # E2E tests
├── package.json
└── tsconfig.json
```

---

## Module Pattern

Every feature module follows this structure:

```
modules/[feature]/
├── [feature].module.ts        # IoC container, imports/exports
├── [feature].controller.ts    # HTTP layer only — no business logic
├── [feature].service.ts       # All business logic lives here
├── dto/
│   ├── create-[feature].dto.ts
│   ├── update-[feature].dto.ts
│   └── [feature]-response.dto.ts
└── [feature].spec.ts          # Unit tests
```

---

## Domain Model

**Core Entities (defined in `prisma/schema.prisma`):**

| Entity | Description |
|--------|-------------|
| `User` | Patient or clinician with email, hashed password, role, clinicId, and profile data |
| `Clinic` | Healthcare organization for multi-tenancy: name, address, phone; owns users |
| `BiomarkerValue` | Timeseries entry: user, biomarker type, timestamp, value, unit, source, metadata |
| `Alert` | Generated from threshold violations: type, severity, status, value vs threshold |
| `LLMSummary` | Generated text (clinician vs patient facing) plus structured flags |

**User Roles (`UserRole` enum):**
- `PATIENT` — sees simplified biomarker trends and behavior nudges
- `CLINICIAN` — sees rich timelines, risk flags, and summarized reports

**Multi-Tenancy (Clinic-based):**
- Users belong to a `Clinic` via `clinicId` foreign key
- Clinicians can only access patients enrolled in their clinic
- Patients can only be enrolled in one clinic at a time
- Analytics and cohort data are scoped to the clinician's clinic
- Clinic ownership is validated on all sensitive operations

---

## Authentication & Token Management

### JWT Token Structure

Tokens contain the following claims (set at login/registration):
- `sub` — User ID
- `email` — User email
- `role` — UserRole (PATIENT or CLINICIAN)
- `clinicId` — Clinic association (optional)

### Cookie-based Authentication

Web clients use HttpOnly cookies for XSS-safe token storage:

```typescript
// CookieService handles all cookie operations
cookieService.setAuthCookie(res, token);   // Set token
cookieService.clearAuthCookie(res);        // Clear on logout
```

Cookie security settings:
- `httpOnly: true` — JavaScript cannot access (XSS protection)
- `secure: true` in production — HTTPS only
- `sameSite: 'strict'` — CSRF protection
- 7-day expiration (configurable via `auth.cookieMaxAge`)

Mobile clients receive tokens in response body and store in secure storage.

### Token Refresh Behavior

JWT tokens are stateless — user data is embedded at creation time. When embedded data changes:

| Operation | Affected Data | Token Refresh |
|-----------|---------------|---------------|
| Clinic creation | `clinicId` | **Automatic** — new token in response + cookie |
| Role change (admin) | `role` | **Manual** — user must re-login |
| Patient enrollment | `clinicId` | **Manual** — patient must re-login |
| Patient unenrollment | `clinicId` | **Manual** — patient must re-login |
| Profile update | firstName, lastName | No refresh needed (not in token) |

### When Adding Endpoints That Modify Token Data

If your endpoint modifies `email`, `role`, or `clinicId` for the **requesting user**:

```typescript
// 1. Inject dependencies
constructor(
  private readonly yourService: YourService,
  private readonly cookieService: CookieService,
  private readonly jwtService: JwtService,
) {}

// 2. Generate new token and set cookie
@Post('your-endpoint')
async yourMethod(
  @CurrentUser() user: UserPayload,
  @Res({ passthrough: true }) res: Response,
) {
  const result = await this.yourService.doSomething(user.sub);

  // Generate new token with updated data
  const newToken = await this.jwtService.signAsync({
    sub: user.sub,
    email: result.email,
    role: result.role,
    clinicId: result.clinicId,
  });

  // Set cookie for web clients
  this.cookieService.setAuthCookie(res, newToken);

  // Return token in body for mobile clients
  return { ...result, accessToken: newToken, tokenType: 'Bearer' };
}
```

If your endpoint modifies data for a **different user** (e.g., admin changing patient's clinic):
- You cannot refresh their token (they're not making the request)
- Document that the affected user must re-login
- This is by design for stateless JWT architecture

**Alert Status Flow (`AlertStatus` enum):**
- `ACTIVE` — Newly created, needs attention
- `ACKNOWLEDGED` — User/clinician has seen it, taking action
- `RESOLVED` — Underlying issue addressed
- `DISMISSED` — Reviewed but no action needed

**Alert Severity (`AlertSeverity` enum):**
- `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

**Biomarker Types (`BiomarkerType` enum):**
- Cardiovascular: `HEART_RATE`, `HEART_RATE_VARIABILITY`, `BLOOD_PRESSURE_*`, etc.
- Metabolic: `GLUCOSE`, `HBA1C`, `CHOLESTEROL_*`, `TRIGLYCERIDES`
- Fitness: `STEPS`, `ACTIVE_CALORIES`, `SLEEP_*`, `VO2_MAX`
- Body composition: `WEIGHT`, `BMI`, `BODY_FAT_PERCENTAGE`
- Blood markers: `VITAMIN_D`, `IRON`, `FERRITIN`, `B12`, `FOLATE`
- Hormones: `TESTOSTERONE`, `CORTISOL`, `TSH`, `T3`, `T4`
- See `prisma/schema.prisma` for complete list

---

## Coding Conventions

### TypeScript

- Strict mode enabled — no implicit any, strict null checks
- Use `enum` or `const` objects for biomarker names, roles, status codes
- Prefer immutable patterns — avoid mutating objects directly
- Explicit return types on all public methods

### Controllers

```typescript
// ✅ Correct: Thin controller, delegates to service
@Post()
async create(@Body() dto: CreateBiomarkerDto, @CurrentUser() user: User) {
  return this.biomarkerService.create(dto, user.id);
}

// ❌ Wrong: Business logic in controller
@Post()
async create(@Body() dto: CreateBiomarkerDto) {
  const normalized = this.normalizeValue(dto.value); // Logic belongs in service
  await this.prisma.biomarker.create({ data: { ...dto, value: normalized } });
}
```

### Services

- All business logic lives in services
- Use constructor injection via NestJS DI — never `new` a service
- Services should be stateless
- Log errors with context, don't swallow exceptions silently

### DTOs and Validation

- All external inputs validated via DTOs + `class-validator`
- Use pipes from `common/pipes/` for parameter transformation
- Create response DTOs for consistent API shapes

```typescript
// ✅ Correct: Explicit DTO with validation
export class CreateBiomarkerDto {
  @IsEnum(BiomarkerType)
  type: BiomarkerType;

  @IsNumber()
  @Min(0)
  value: number;

  @IsISO8601()
  timestamp: string;
}
```

### Error Handling

- Use exception filters from `common/filters/`
- Map Prisma errors to appropriate HTTP exceptions
- LLM failures should degrade gracefully — return generic message, don't crash
- Always include correlation IDs in error logs

**Prisma Error Mappings (`PrismaExceptionFilter`):**

| Prisma Code | HTTP Status | Meaning |
|-------------|-------------|---------|
| P2002 | 409 Conflict | Unique constraint violation |
| P2025 | 404 Not Found | Record not found |
| P2003 | 400 Bad Request | Foreign key constraint violation |
| ValidationError | 400 Bad Request | Invalid data format |
| InitializationError | 503 Unavailable | Database connection failed |

---

## OpenMed PII De-identification

**Location:** `modules/openmed/` (NestJS) + `openmed-service/` (Python)

### Architecture

The OpenMed integration uses a hybrid architecture to leverage Python's medical NER capabilities while maintaining the NestJS backend:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Patient Data   │ --> │  OpenMed Service │ --> │   Claude API    │
│ (Clinical Notes)│     │  (De-identify)   │     │ (Safe Analysis) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                        ┌──────┴──────┐
                        │ Audit Logs  │
                        │ (HIPAA)     │
                        └─────────────┘
```

### De-identification Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| `mask` | Replace with `[TYPE]` placeholder | Default, preserves context |
| `remove` | Delete PII entirely | Maximum privacy |
| `replace` | Substitute with fake values | Testing/demo |
| `hash` | One-way hash (SHA-256) | Linkable anonymization |
| `shift_dates` | Shift dates by random offset | Temporal analysis |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENMED_SERVICE_URL` | Python microservice URL | `http://localhost:8001` |
| `OPENMED_API_KEY` | API key for authentication | Required in production |
| `OPENMED_TIMEOUT` | Request timeout (ms) | `30000` |
| `OPENMED_CONFIDENCE_THRESHOLD` | PII detection threshold (0-1) | `0.7` |
| `OPENMED_ENABLED` | Enable/disable feature | `true` |
| `OPENMED_ALLOW_PASSTHROUGH` | Allow passthrough on failure | `false` (production) |

### Usage Pattern

```typescript
// De-identify clinical notes before LLM processing
const safeNotes = await this.openMedService.deidentify({
  text: clinicalNotes,
  method: 'mask',
  includeOriginalText: false, // Never include PHI in logs
});

// Build prompt with de-identified notes
const prompt = await this.llmService.buildUserPromptWithClinicalNotes(
  biomarkers,
  clinicalNotes,
  userId, // For audit trail
);
```

### Safety Rules

| Rule | Implementation |
|------|----------------|
| Fail-secure | Throws error instead of passing PHI through in production |
| Audit logging | All de-identification requests logged with userId, requestId |
| No PHI in responses | `includeOriginalText: false` by default |
| Size limits | 1MB max text size to prevent DoS |
| Rate limiting | 100 req/min per IP on microservice |

### Docker Commands

| Action | Command |
|--------|---------|
| Start OpenMed service | `docker-compose up -d openmed` |
| View OpenMed logs | `docker-compose logs -f openmed` |
| Restart OpenMed | `docker-compose restart openmed` |

### OpenAPI Documentation

| Service | URL | Description |
|---------|-----|-------------|
| NestJS API | `http://localhost:3000/api/docs` | Main API docs (Swagger UI) |
| OpenMed Microservice | `http://localhost:8001/docs` | PII de-identification API (Swagger UI) |
| OpenMed ReDoc | `http://localhost:8001/redoc` | Alternative documentation format |

**OpenMed API Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/deidentify` | De-identify clinical text | API Key |
| `POST` | `/extract-pii` | Extract PII entities without de-identification | API Key |
| `GET` | `/health` | Service health check | None |

---

## LLM Integration Rules

**Location:** `modules/llm/llm.service.ts`

### Safety Constraints — MUST FOLLOW

| Rule | Description |
|------|-------------|
| No diagnoses | Never introduce new diagnoses |
| No medication changes | Never suggest medication changes |
| Defer to clinicians | Always direct users to clinicians for decisions |
| Explain, don't prescribe | Frame outputs as trend explanations, not medical advice |
| De-identify PII | Always use OpenMed to de-identify clinical notes before LLM calls |
| Fail-secure for PHI | If de-identification fails, exclude clinical notes from prompt |

### Allowed LLM Output Types

- Explanations of biomarker trends
- Flags for clinician review
- Suggestions for questions to ask a doctor
- General wellness nudges (sleep, exercise, hydration)

### Implementation Pattern

```typescript
// Always wrap LLM calls with safety checks
async generateSummary(biomarkers: BiomarkerValue[], role: UserRole): Promise<LLMSummary> {
  try {
    const prompt = this.buildPrompt(biomarkers, role);
    const response = await this.callLLM(prompt);
    return this.validateAndSanitize(response); // Enforce safety constraints
  } catch (error) {
    this.logger.error('LLM call failed', { error, biomarkerCount: biomarkers.length });
    return this.getFallbackSummary(); // Graceful degradation
  }
}
```

---

## Health Checks

**Endpoints:**

| Endpoint | Purpose |
|----------|---------|
| `/health/live` | Basic liveness probe |
| `/health/ready` | Readiness (DB + LLM reachable) |
| `/health` | Detailed multi-indicator health |

**When Adding Dependencies:**
If you add a new critical external dependency (API, service, queue), add a corresponding health indicator in `modules/health/` so orchestrators have accurate system health visibility.

---

## Seed Data

**Location:** `prisma/seed.ts`
**Run:** `cd server && npx prisma db seed`

The seed script is idempotent and creates demo data for local development:

| Data | Details |
|------|---------|
| Clinic | 1 clinic ("Mystasis Demo Clinic") |
| Clinician | `clinician@mystasis.dev` / `TestPass123` (CLINICIAN role) |
| Patients | `lucia@mystasis.dev`, `john@mystasis.dev`, `maria@mystasis.dev` (PATIENT role, same password) |
| Biomarkers | ~60 readings per patient (12 types x 5 readings, spread over 3 months, source: `seed_data`) |

Users are upserted on email. Seed biomarkers (identified by `source: 'seed_data'`) are deleted and reinserted on each run.

---

## Database Guidelines

- Use Prisma for all database access
- Migrations via `prisma migrate dev` for development
- Use TimescaleDB hypertables for biomarker timeseries data
- Index frequently queried columns (userId, timestamp, biomarkerType)
- Use transactions for multi-step operations

---

## Testing Requirements

### Unit Tests

- Test services in isolation with mocked dependencies
- Cover happy path + edge cases + error conditions
- Use descriptive test names: `should return alert when HRV drops below threshold`

### Integration Tests

- Test controller endpoints with supertest
- Verify auth guards and role restrictions
- Test database operations against test database

### Before Committing

1. Run `npm test` — all tests pass
2. Run `npm run lint` — no lint errors
3. Run `npm run build` — compiles without errors

---

## Agent Instructions

### When Adding a New Feature

1. Identify which existing module it belongs to, or create a new module
2. Check similar modules for patterns (copy structure from `modules/users/` or `modules/health-data/`)
3. Create DTOs in the module's `dto/` folder
4. Implement service logic first, then wire up controller
5. Add validation pipes for any new parameter types
6. Write tests alongside implementation
7. Update health checks if adding external dependencies

### When Modifying Existing Code

1. Read the existing service and controller to understand current patterns
2. Check `common/` for reusable utilities before creating new ones
3. Maintain existing code style and patterns
4. Update related tests
5. Verify the module still builds and tests pass

### When Working with LLM Module

1. Review safety constraints above — they are non-negotiable
2. Test prompts manually before committing
3. Ensure fallback behavior exists for LLM failures
4. Log all LLM interactions for debugging and audit
5. **Always de-identify clinical notes** using `OpenMedService.deidentify()` before including in prompts
6. Use `buildUserPromptWithClinicalNotes()` for prompts that include clinical text

### When Working with OpenMed Module

1. Never set `OPENMED_ALLOW_PASSTHROUGH=true` in production
2. Always include `userId` in audit trail calls for HIPAA compliance
3. Use `includeOriginalText: false` (default) to keep PHI out of responses/logs
4. Test with realistic clinical notes containing various PII types
5. Monitor confidence scores — adjust threshold if false negatives occur
6. The Python microservice must be running for de-identification to work

### Verification Checklist

- [ ] Business logic is in service, not controller
- [ ] All inputs validated via DTOs
- [ ] Errors handled gracefully with appropriate HTTP codes
- [ ] Tests written and passing
- [ ] No hardcoded configuration (use `config/`)
- [ ] LLM outputs respect safety constraints
- [ ] Code follows existing module patterns
- [ ] Clinical notes de-identified before LLM calls (if applicable)
- [ ] HIPAA audit logging includes userId for PHI operations
