import { Module } from '@nestjs/common';
import { HealthDataController } from './health-data.controller';
import { HealthDataService } from './health-data.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [HealthDataController],
  providers: [HealthDataService],
  exports: [HealthDataService],
})
export class HealthDataModule {}
