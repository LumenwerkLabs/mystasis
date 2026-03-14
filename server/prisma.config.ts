import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Required for Prisma CLI commands (migrate, seed).
    // At runtime, the connection is managed by @prisma/adapter-pg in PrismaService.
    url: env('DATABASE_URL'),
  },
});
