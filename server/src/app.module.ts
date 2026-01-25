import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { HealthDataModule } from './modules/health-data/health-data.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { LlmModule } from './modules/llm/llm.module';
import { OpenMedModule } from './modules/openmed/openmed.module';

@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    PrismaModule,
    // Rate limiting: Default 10 requests per 60 seconds
    // Individual endpoints can override with @Throttle decorator
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds in milliseconds
        limit: 10, // 10 requests per TTL window
      },
    ]),
    HealthModule,
    UsersModule,
    HealthDataModule,
    AlertsModule,
    AuthModule,
    ClinicsModule,
    AnalyticsModule,
    LlmModule,
    OpenMedModule,
  ],
  controllers: [],
  providers: [
    // Enable ThrottlerGuard globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
