import 'dotenv/config';
import { PrismaClient, UserRole, BiomarkerType } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// Guard: prevent seed from running in production
if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed script must not run in production');
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SEED_SOURCE = 'seed_data';
const CLINIC_NAME = 'Mystasis Demo Clinic';
const PASSWORD = process.env.SEED_PASSWORD || crypto.randomUUID();
const CLINIC_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

const clinician = {
  email: 'clinician@mystasis.dev',
  firstName: 'Demo',
  lastName: 'Clinician',
  birthdate: new Date('1980-06-15'),
  role: UserRole.CLINICIAN,
};

const patients = [
  {
    email: 'lucia@mystasis.dev',
    firstName: 'Lucia',
    lastName: 'Schlegel',
    birthdate: new Date('1992-03-22'),
  },
  {
    email: 'john@mystasis.dev',
    firstName: 'John',
    lastName: 'Davies',
    birthdate: new Date('1988-11-08'),
  },
  {
    email: 'maria@mystasis.dev',
    firstName: 'Maria',
    lastName: 'Garcia',
    birthdate: new Date('1995-07-14'),
  },
];

interface BiomarkerSpec {
  type: BiomarkerType;
  unit: string;
  baseValue: number;
  variance: number;
  trend: number; // positive = increasing over time
}

const biomarkerSpecs: BiomarkerSpec[] = [
  // Required for LLM summary generation (service queries HRV specifically)
  { type: BiomarkerType.HEART_RATE_VARIABILITY, unit: 'ms', baseValue: 55, variance: 10, trend: 2.0 },
  { type: BiomarkerType.HEART_RATE, unit: 'bpm', baseValue: 68, variance: 8, trend: -1.0 },
  { type: BiomarkerType.RESTING_HEART_RATE, unit: 'bpm', baseValue: 62, variance: 5, trend: -0.5 },
  { type: BiomarkerType.GLUCOSE, unit: 'mg/dL', baseValue: 92, variance: 8, trend: -0.5 },
  { type: BiomarkerType.HBA1C, unit: '%', baseValue: 5.3, variance: 0.2, trend: -0.05 },
  { type: BiomarkerType.CHOLESTEROL_LDL, unit: 'mg/dL', baseValue: 120, variance: 10, trend: -1.5 },
  { type: BiomarkerType.CHOLESTEROL_HDL, unit: 'mg/dL', baseValue: 58, variance: 5, trend: 1.0 },
  { type: BiomarkerType.TRIGLYCERIDES, unit: 'mg/dL', baseValue: 95, variance: 12, trend: -2.0 },
  { type: BiomarkerType.VITAMIN_D, unit: 'ng/mL', baseValue: 42, variance: 5, trend: 2.0 },
  { type: BiomarkerType.B12, unit: 'pg/mL', baseValue: 600, variance: 50, trend: 15 },
  { type: BiomarkerType.FERRITIN, unit: 'ng/mL', baseValue: 110, variance: 15, trend: 3 },
  { type: BiomarkerType.TSH, unit: 'mIU/L', baseValue: 2.0, variance: 0.3, trend: -0.05 },
  { type: BiomarkerType.TESTOSTERONE, unit: 'ng/dL', baseValue: 580, variance: 40, trend: 8 },
  { type: BiomarkerType.CORTISOL, unit: 'μg/dL', baseValue: 14, variance: 3, trend: -0.5 },
  { type: BiomarkerType.CRP, unit: 'mg/L', baseValue: 1.0, variance: 0.3, trend: -0.05 },
];

function generateReadings(spec: BiomarkerSpec, patientIndex: number): number[] {
  // Each patient gets slightly different base values
  const patientOffset = (patientIndex - 1) * spec.variance * 0.3;
  const readings: number[] = [];

  for (let i = 0; i < 5; i++) {
    const trendEffect = spec.trend * i;
    const noise = (Math.random() - 0.5) * spec.variance;
    const value = spec.baseValue + patientOffset + trendEffect + noise;
    readings.push(Math.round(value * 100) / 100);
  }

  return readings;
}

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  // Upsert clinic
  const clinic = await prisma.clinic.upsert({
    where: { id: CLINIC_ID },
    update: { name: CLINIC_NAME },
    create: {
      id: CLINIC_ID,
      name: CLINIC_NAME,
      address: '123 Longevity Lane, San Francisco, CA 94102',
      phone: '+1-555-0100',
    },
  });
  console.log(`  ✓ Clinic: ${clinic.name}`);

  // Upsert clinician
  const clinicianUser = await prisma.user.upsert({
    where: { email: clinician.email },
    update: {
      firstName: clinician.firstName,
      lastName: clinician.lastName,
      role: clinician.role,
      clinicId: clinic.id,
    },
    create: {
      email: clinician.email,
      password: hashedPassword,
      firstName: clinician.firstName,
      lastName: clinician.lastName,
      birthdate: clinician.birthdate,
      role: clinician.role,
      clinicId: clinic.id,
    },
  });
  console.log(`  ✓ Clinician: ${clinicianUser.email}`);

  // Upsert patients and create biomarker data
  for (let pIdx = 0; pIdx < patients.length; pIdx++) {
    const p = patients[pIdx];
    const patientUser = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        firstName: p.firstName,
        lastName: p.lastName,
        role: UserRole.PATIENT,
        clinicId: clinic.id,
      },
      create: {
        email: p.email,
        password: hashedPassword,
        firstName: p.firstName,
        lastName: p.lastName,
        birthdate: p.birthdate,
        role: UserRole.PATIENT,
        clinicId: clinic.id,
      },
    });

    // Delete existing seed biomarkers for this patient
    await prisma.biomarkerValue.deleteMany({
      where: {
        userId: patientUser.id,
        source: SEED_SOURCE,
      },
    });

    // Generate biomarker readings
    const biomarkerRecords: {
      userId: string;
      type: BiomarkerType;
      value: number;
      unit: string;
      timestamp: Date;
      source: string;
    }[] = [];

    const now = new Date();
    for (const spec of biomarkerSpecs) {
      const readings = generateReadings(spec, pIdx);
      for (let i = 0; i < readings.length; i++) {
        // Spread readings over the last month (7-day intervals)
        // Ensures data falls within the LLM service's 30-day lookback window
        const daysAgo = (readings.length - 1 - i) * 7;
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - daysAgo);
        // Add some hour variance
        timestamp.setHours(8 + Math.floor(Math.random() * 4));

        biomarkerRecords.push({
          userId: patientUser.id,
          type: spec.type,
          value: readings[i],
          unit: spec.unit,
          timestamp,
          source: SEED_SOURCE,
        });
      }
    }

    await prisma.biomarkerValue.createMany({ data: biomarkerRecords });
    console.log(
      `  ✓ Patient: ${patientUser.email} (${biomarkerRecords.length} biomarker readings)`,
    );
  }

  console.log('\n✅ Seed complete!');
  console.log(`   Login: ${clinician.email}`);
  if (process.env.SEED_PASSWORD) {
    console.log('   Password: (from SEED_PASSWORD env var)');
  } else {
    console.log(`   Password: ${PASSWORD} (auto-generated, set SEED_PASSWORD to control)`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
