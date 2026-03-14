import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import cookieParser from 'cookie-parser';

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
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Custom body parser with increased limit for health data sync batches
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ limit: '5mb', extended: true }));

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

  // Cookie parser middleware for HttpOnly cookie authentication (web clients)
  app.use(cookieParser());

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
    .setTitle('MyStasis API')
    .setDescription(
      'Longevity-focused health platform API for consolidating wearables data, ' +
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
    .addTag('Auth', 'Authentication and user registration')
    .addTag('Health-Data', 'Biomarker data management and wearable sync')
    .addTag('Alerts', 'Health alerts from biomarker threshold violations')
    .addTag('Analytics', 'Cohort-level analytics for clinicians')
    .addTag('LLM', 'LLM-generated summaries and nudges')
    .addTag('Clinics', 'Clinic management and multi-tenancy')
    .addTag('Health', 'Application health checks')
    .addTag(
      'OpenMed',
      'PII de-identification for clinical notes (internal service - see openmed-service/docs for microservice API)',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Failed to bootstrap application:', err);
  process.exit(1);
});
