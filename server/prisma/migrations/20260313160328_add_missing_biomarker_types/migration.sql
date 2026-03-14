-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BiomarkerType" ADD VALUE 'WALKING_HEART_RATE';
ALTER TYPE "BiomarkerType" ADD VALUE 'BLOOD_OXYGEN';
ALTER TYPE "BiomarkerType" ADD VALUE 'RESPIRATORY_RATE';
ALTER TYPE "BiomarkerType" ADD VALUE 'BODY_TEMPERATURE';
ALTER TYPE "BiomarkerType" ADD VALUE 'PERIPHERAL_PERFUSION_INDEX';
ALTER TYPE "BiomarkerType" ADD VALUE 'BASAL_CALORIES';
ALTER TYPE "BiomarkerType" ADD VALUE 'SLEEP_DEEP';
ALTER TYPE "BiomarkerType" ADD VALUE 'SLEEP_REM';
ALTER TYPE "BiomarkerType" ADD VALUE 'SLEEP_LIGHT';
ALTER TYPE "BiomarkerType" ADD VALUE 'SLEEP_AWAKE';
ALTER TYPE "BiomarkerType" ADD VALUE 'EXERCISE_TIME';
ALTER TYPE "BiomarkerType" ADD VALUE 'DISTANCE_WALKING_RUNNING';
ALTER TYPE "BiomarkerType" ADD VALUE 'DISTANCE_SWIMMING';
ALTER TYPE "BiomarkerType" ADD VALUE 'DISTANCE_CYCLING';
ALTER TYPE "BiomarkerType" ADD VALUE 'FLIGHTS_CLIMBED';
ALTER TYPE "BiomarkerType" ADD VALUE 'HEIGHT';
ALTER TYPE "BiomarkerType" ADD VALUE 'WAIST_CIRCUMFERENCE';
ALTER TYPE "BiomarkerType" ADD VALUE 'WATER_INTAKE';
ALTER TYPE "BiomarkerType" ADD VALUE 'FORCED_EXPIRATORY_VOLUME';
ALTER TYPE "BiomarkerType" ADD VALUE 'ELECTRODERMAL_ACTIVITY';
ALTER TYPE "BiomarkerType" ADD VALUE 'ATRIAL_FIBRILLATION_BURDEN';
