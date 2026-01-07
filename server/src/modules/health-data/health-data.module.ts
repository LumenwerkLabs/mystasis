import { Module } from '@nestjs/common';
import { HealthDataService } from './health-data.service';

@Module({
  providers: [HealthDataService],
  exports: [HealthDataService],
})
export class HealthDataModule {}
