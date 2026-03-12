import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from './database.config';
import { authConfig } from './auth.config';
import { openmedConfig } from './openmed.config';
import { llmConfig } from './llm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig, openmedConfig, llmConfig],
      expandVariables: true,
    }),
  ],
})
export class AppConfigModule {}
