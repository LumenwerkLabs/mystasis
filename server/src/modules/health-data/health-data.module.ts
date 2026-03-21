import { Module } from '@nestjs/common';
import { HealthDataController } from './health-data.controller';
import { HealthDataService } from './health-data.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [HealthDataController],
  providers: [HealthDataService],
  exports: [HealthDataService],
})
export class HealthDataModule {}
