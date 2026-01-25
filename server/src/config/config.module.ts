import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from './database.config';
import { authConfig } from './auth.config';
import { openmedConfig } from './openmed.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig, openmedConfig],
      expandVariables: true,
    }),
  ],
})
export class AppConfigModule {}
