# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
    - `GET /clinics` - List clinician's own clinic (prevents enumeration)
    - `GET /clinics/:id` - Get clinic by ID (owner only)
    - `PATCH /clinics/:id` - Update clinic (owner only)
    - `DELETE /clinics/:id` - Delete clinic (owner only)
    - `POST /clinics/:clinicId/patients/:patientId` - Enroll patient (owner only)
    - `DELETE /clinics/:clinicId/patients/:patientId` - Unenroll patient (owner only)
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
