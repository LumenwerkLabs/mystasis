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
| Build for production | `cd server && npm run build` |

---

## Architecture Overview

```
server/
├── src/
│   ├── main.ts                    # Bootstrap, global filters/pipes/interceptors
│   ├── app.module.ts              # Root module wiring
│   ├── config/                    # Centralized configuration
│   ├── core/
│   │   └── prisma/                # Database access layer
│   │       ├── prisma.module.ts
│   │       ├── prisma.service.ts
│   │       └── schema.prisma
│   ├── common/                    # Shared utilities
│   │   ├── dto/                   # Shared DTOs (BiomarkerDto, UserDto, etc.)
│   │   ├── decorators/            # @ClinicianOnly(), @CurrentUser()
│   │   ├── guards/                # JWT auth, role-based guards
│   │   ├── pipes/                 # UserByIdPipe, ParseBiomarkerPipe, ValidateFilePipe
│   │   ├── filters/               # Exception filters (Prisma errors, LLM timeouts)
│   │   ├── interceptors/          # Logging, response shaping, rate limiting
│   │   └── interfaces/            # Shared TypeScript interfaces
│   └── modules/
│       ├── auth/                  # Authentication & JWT
│       ├── users/                 # User profiles and roles
│       ├── health-data/           # Wearable sync, lab uploads, biomarker trends
│       ├── llm/                   # LLM summaries and nudges
│       ├── analytics/             # Cohort-level insights for clinics
│       └── health/                # Health checks (/health, /live, /ready)
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

**Core Entities:**

| Entity | Description |
|--------|-------------|
| `User` | Patient or clinician with role-based access |
| `BiomarkerValue` | Timeseries entry: user, biomarker type, timestamp, value, unit, source |
| `Alert` | Generated from rules on biomarker trends |
| `LLMSummary` | Generated text (clinician vs patient facing) plus structured flags |

**Roles:**
- `patient` — sees simplified biomarker trends and behavior nudges
- `clinician` — sees rich timelines, risk flags, and summarized reports

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

### Verification Checklist

- [ ] Business logic is in service, not controller
- [ ] All inputs validated via DTOs
- [ ] Errors handled gracefully with appropriate HTTP codes
- [ ] Tests written and passing
- [ ] No hardcoded configuration (use `config/`)
- [ ] LLM outputs respect safety constraints
- [ ] Code follows existing module patterns
