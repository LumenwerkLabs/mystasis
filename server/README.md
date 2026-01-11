# Mystasis Backend

Longevity-focused health platform backend that consolidates wearable data, lab results, and clinical information, then uses health-tuned LLMs to generate safe insights for patients and clinicians.

## Quick Start

```bash
# Prerequisites
node >= 20.x
npm >= 10.x
PostgreSQL >= 14

# Installation
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Architecture

```
src/
├── main.ts                    # App entry point
├── app.module.ts              # Root module
├── config/                    # Configuration
├── core/
│   └── prisma/                # Database access layer
├── common/
│   ├── decorators/            # @Roles(), @CurrentUser()
│   ├── guards/                # JWT auth, role-based guards
│   ├── filters/               # Exception filters
│   └── dto/                   # Shared DTOs
└── modules/
    ├── auth/                  # Authentication & JWT
    ├── users/                 # User management
    ├── health-data/           # Biomarker data
    ├── alerts/                # Health alerts
    ├── llm/                   # LLM summaries and nudges
    └── health/                # Health checks
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | Secret for signing JWT tokens | Yes | - |
| `JWT_EXPIRATION` | Token expiration time | No | `1d` |
| `LLM_API_URL` | LLM service endpoint (OpenAI-compatible) | Yes | - |
| `LLM_API_KEY` | API key for LLM service | Yes | - |
| `LLM_MODEL` | LLM model identifier | Yes | - |
| `PORT` | Server port | No | `3000` |
| `NODE_ENV` | Environment (development/production) | No | `development` |

### Example `.env` file

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/mystasis?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRATION="1d"
LLM_API_URL="https://api.openai.com/v1/chat/completions"
LLM_API_KEY="sk-your-api-key"
LLM_MODEL="gpt-4"
PORT=3000
NODE_ENV=development
```

## Authentication & Authorization

### JWT Authentication

Protected routes use `JwtAuthGuard` for Bearer token authentication:

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req) {
  return req.user;
}
```

### Role-Based Access Control

Use `@Roles()` decorator with `RolesGuard` to restrict access:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLINICIAN)
@Get('patients')
getAllPatients() {
  return this.patientsService.findAll();
}
```

Available roles: `PATIENT`, `CLINICIAN`

## Input Validation

The API uses global validation with strict security settings:

- **DTO Validation**: All request bodies are validated against DTOs using `class-validator`
- **Whitelist Mode**: Unknown properties are automatically stripped from requests
- **Strict Mode**: Requests with unknown properties return 400 Bad Request
- **UUID Validation**: Route parameters (e.g., `userId`) are validated as UUID v4 format

```typescript
// Example: Invalid request body
POST /llm/summary/user-123  // 400 - Invalid UUID format
POST /llm/summary/valid-uuid { "invalidField": "value" }  // 400 - Unknown property
```

## LLM Integration

The LLM service generates health insights with strict medical safety constraints.

### Endpoints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/llm/summary/:userId` | CLINICIAN | Generate health summary |
| `GET` | `/llm/nudge/:userId` | PATIENT | Get wellness nudge (own data only) |

### Generate Summary

```bash
# Request (CLINICIAN only)
curl -X POST 'http://localhost:3000/llm/summary/user-uuid-here' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"summaryType": "WEEKLY_SUMMARY"}'

# Response
{
  "id": "summary-uuid",
  "content": "Your biomarker trends show...",
  "type": "WEEKLY_SUMMARY",
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "disclaimer": "Discuss these findings with your healthcare provider.",
  "structuredData": {
    "flags": ["Elevated HRV variability"],
    "recommendations": ["Consider sleep tracking"],
    "questionsForDoctor": ["Ask about stress management"]
  }
}
```

**Summary Types:** `DAILY_RECAP`, `WEEKLY_SUMMARY`, `TREND_ANALYSIS`, `RISK_ASSESSMENT`, `WELLNESS_NUDGE`, `CLINICIAN_REPORT`

### Get Wellness Nudge

```bash
# Request (PATIENT only, own userId)
curl -X GET 'http://localhost:3000/llm/nudge/your-user-uuid' \
  -H 'Authorization: Bearer <token>'

# Response
{
  "id": "nudge-uuid",
  "content": "Great progress on your activity this week!",
  "type": "WELLNESS_NUDGE",
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "disclaimer": "Discuss these findings with your healthcare provider."
}
```

### Features

- Health summaries from biomarker trends
- Wellness nudges for patients
- Clinician reports with structured flags

### Safety Constraints

All LLM outputs are sanitized to remove:
- Diagnosis language ("you have diabetes")
- Medication advice ("take 500mg")
- Treatment prescriptions

Every response includes a healthcare disclaimer.

### Configuration

LLM integration requires three environment variables:
- `LLM_API_URL`: Endpoint compatible with OpenAI chat completions API
- `LLM_API_KEY`: Authentication key
- `LLM_MODEL`: Model identifier (e.g., "gpt-4", "claude-3-opus")

## Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

## Health Checks

| Endpoint | Purpose |
|----------|---------|
| `/health/live` | Liveness probe |
| `/health/ready` | Readiness (DB connectivity) |
| `/health` | Detailed health status |

## API Documentation

When running in development, Swagger documentation is available at `/api/docs`.

## Database

Uses Prisma ORM with PostgreSQL. Key models:

- `User` - Patients and clinicians
- `BiomarkerValue` - Timeseries health data
- `Alert` - Health threshold violations
- `LLMSummary` - Generated insights

### Migrations

```bash
# Create migration
npx prisma migrate dev --name description

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

## License

Proprietary - All rights reserved.
