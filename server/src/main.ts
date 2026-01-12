import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

/**
 * Bootstrap the NestJS application with security middleware and global configuration.
 *
 * @description Initializes the application with the following security layers:
 * - Helmet middleware for security headers (XSS, clickjacking protection)
 * - Restrictive CORS policy (requires CORS_ORIGIN in production)
 * - Global ValidationPipe for DTO validation and sanitization
 * - PrismaExceptionFilter for consistent database error handling
 *
 * @returns Promise that resolves when the application is listening
 *
 * @throws {Error} When CORS_ORIGIN is not set in production environment
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Security: Helmet middleware for security headers
  app.use(helmet());

  // Security: Restrictive CORS policy
  // In production, CORS_ORIGIN must be explicitly configured
  const corsOrigin = process.env.CORS_ORIGIN;
  if (process.env.NODE_ENV === 'production' && !corsOrigin) {
    throw new Error(
      'CORS_ORIGIN environment variable must be set in production',
    );
  }

  app.enableCors({
    origin: corsOrigin || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global validation pipe for DTO validation
  // Required for class-validator decorators to work
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties from DTOs
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
