import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { AnamnesisController } from './anamnesis.controller';
import { AnamnesisService } from './anamnesis.service';
import { HTTP_SERVICE_TOKEN } from './anamnesis.constants';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, HttpModule],
  controllers: [AnamnesisController],
  providers: [
    AnamnesisService,
    {
      provide: HTTP_SERVICE_TOKEN,
      useExisting: HttpService,
    },
  ],
  exports: [AnamnesisService],
})
export class AnamnesisModule {}
