import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
  // Configure CSP to allow Swagger UI resources
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
        },
      },
    }),
  );

  // Security: Restrictive CORS policy
  // In production, CORS_ORIGIN must be explicitly configured
  const corsOrigin = process.env.CORS_ORIGIN;
  if (process.env.NODE_ENV === 'production' && !corsOrigin) {
    throw new Error(
      'CORS_ORIGIN environment variable must be set in production',
    );
  }

  app.enableCors({
    // In development, allow any origin for local testing
    // In production, use the explicitly configured CORS_ORIGIN
    origin: corsOrigin || true,
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

  // OpenAPI/Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Mystasis API')
    .setDescription(
      'Longevity-focused health platform API for consolidating wearable data, ' +
        'lab results, and clinical information with LLM-generated insights.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication and user registration')
    .addTag('health-data', 'Biomarker data management and wearable sync')
    .addTag('alerts', 'Health alerts from biomarker threshold violations')
    .addTag('analytics', 'Cohort-level analytics for clinicians')
    .addTag('llm', 'LLM-generated summaries and nudges')
    .addTag('clinics', 'Clinic management and multi-tenancy')
    .addTag('health', 'Application health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
