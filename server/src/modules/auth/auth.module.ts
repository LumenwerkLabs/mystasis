import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { JWT_SERVICE } from '../../common/guards/jwt-auth.guard';

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
 * - auth.jwtExpiration: Token expiration time (default '24h')
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
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwtExpiration') || '24h',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: JWT_SERVICE,
      useFactory: (jwtService: JwtService) => jwtService,
      inject: [JwtService],
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
