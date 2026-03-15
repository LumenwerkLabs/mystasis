-- CreateTable
CREATE TABLE "Anamnesis" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "rawTranscript" TEXT NOT NULL,
    "chiefComplaint" TEXT NOT NULL,
    "historyOfPresentIllness" TEXT NOT NULL,
    "pastMedicalHistory" TEXT[],
    "currentMedications" TEXT[],
    "allergies" TEXT[],
    "familyHistory" TEXT[],
    "reviewOfSystems" TEXT[],
    "socialHistory" TEXT[],
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anamnesis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Anamnesis_patientId_idx" ON "Anamnesis"("patientId");

-- CreateIndex
CREATE INDEX "Anamnesis_clinicianId_idx" ON "Anamnesis"("clinicianId");

-- CreateIndex
CREATE INDEX "Anamnesis_recordedAt_idx" ON "Anamnesis"("recordedAt");

-- CreateIndex
CREATE INDEX "Anamnesis_patientId_recordedAt_idx" ON "Anamnesis"("patientId", "recordedAt");

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
