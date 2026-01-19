-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'CLINICIAN');

-- CreateEnum
CREATE TYPE "BiomarkerType" AS ENUM ('HEART_RATE', 'HEART_RATE_VARIABILITY', 'BLOOD_PRESSURE_SYSTOLIC', 'BLOOD_PRESSURE_DIASTOLIC', 'RESTING_HEART_RATE', 'GLUCOSE', 'HBA1C', 'CHOLESTEROL_TOTAL', 'CHOLESTEROL_LDL', 'CHOLESTEROL_HDL', 'TRIGLYCERIDES', 'STEPS', 'ACTIVE_CALORIES', 'SLEEP_DURATION', 'SLEEP_QUALITY', 'VO2_MAX', 'WEIGHT', 'BMI', 'BODY_FAT_PERCENTAGE', 'VITAMIN_D', 'IRON', 'FERRITIN', 'B12', 'FOLATE', 'CRP', 'ESR', 'TESTOSTERONE', 'CORTISOL', 'TSH', 'T3', 'T4', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "SummaryType" AS ENUM ('DAILY_RECAP', 'WEEKLY_SUMMARY', 'TREND_ANALYSIS', 'RISK_ASSESSMENT', 'WELLNESS_NUDGE', 'CLINICIAN_REPORT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiomarkerValue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BiomarkerType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiomarkerValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BiomarkerType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SummaryType" NOT NULL,
    "content" TEXT NOT NULL,
    "structuredData" JSONB,
    "audienceRole" "UserRole" NOT NULL,
    "modelVersion" TEXT,
    "promptHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LLMSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "BiomarkerValue_userId_idx" ON "BiomarkerValue"("userId");

-- CreateIndex
CREATE INDEX "BiomarkerValue_type_idx" ON "BiomarkerValue"("type");

-- CreateIndex
CREATE INDEX "BiomarkerValue_timestamp_idx" ON "BiomarkerValue"("timestamp");

-- CreateIndex
CREATE INDEX "BiomarkerValue_userId_type_timestamp_idx" ON "BiomarkerValue"("userId", "type", "timestamp");

-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "Alert"("userId");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "LLMSummary_userId_idx" ON "LLMSummary"("userId");

-- CreateIndex
CREATE INDEX "LLMSummary_type_idx" ON "LLMSummary"("type");

-- CreateIndex
CREATE INDEX "LLMSummary_createdAt_idx" ON "LLMSummary"("createdAt");

-- AddForeignKey
ALTER TABLE "BiomarkerValue" ADD CONSTRAINT "BiomarkerValue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LLMSummary" ADD CONSTRAINT "LLMSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
