# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
