import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';

/**
 * Authentication module for user registration, login, and JWT-based authentication.
 *
 * @description Provides authentication infrastructure including:
 * - User registration and login endpoints
 * - JWT token generation and validation
 * - Passport JWT strategy for protected routes
 *
 * @remarks
 * This module requires the following configuration:
 * - auth.jwtSecret: Secret key for signing JWTs (min 32 characters)
 * - auth.accessTokenExpiration: Access token lifetime (default '15m')
 *
 * Dependencies:
 * - ConfigModule (global): For JWT configuration
 * - UsersModule: For user creation and lookup
 *
 * @example
 * // Import in app.module.ts
 * import { AuthModule } from './modules/auth/auth.module';
 *
 * @Module({
 *   imports: [AuthModule],
 * })
 * export class AppModule {}
 */
@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('auth.jwtSecret');
        if (!secret) {
          throw new Error('JWT secret is not configured');
        }
        return {
          secret,
          signOptions: {
            expiresIn: 900, // 15 minutes in seconds
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
