import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole, User } from '../../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TokenBlacklistService } from '../../common/services/token-blacklist.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * User type without password field for safe return values.
 */
type UserWithoutPassword = Omit<User, 'password'>;

/**
 * JWT payload structure for token signing.
 */
interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  clinicId?: string;
  jti: string;
}

/**
 * Token pair returned from authentication operations.
 */
interface TokenPair {
  access_token: string;
  refresh_token: string;
}

/**
 * Authentication response structure.
 */
interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: UserWithoutPassword;
}

/**
 * Authentication service with refresh token rotation and token revocation.
 *
 * Security model:
 * - Short-lived access tokens (15m) with `jti` claim for revocation
 * - Long-lived refresh tokens (7d) stored in DB with rotation
 * - Replay detection: if a revoked refresh token is reused, the entire
 *   token family is revoked (compromise mitigation)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokenExpirationDays: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    this.refreshTokenExpirationDays =
      this.configService.get<number>('auth.refreshTokenExpirationDays') || 7;
  }

  /**
   * Registers a new user and returns a token pair.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      birthdate: new Date(dto.birthdate),
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.PATIENT,
    });

    const tokens = await this.generateTokenPair(user);

    this.logger.log(`User registered: ${user.email}`);

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Authenticates user and returns a token pair.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      this.logger.warn(`Failed login attempt for email: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for email: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _password, ...userWithoutPassword } = user;
    void _password;

    const tokens = await this.generateTokenPair(userWithoutPassword);

    this.logger.log(`Successful login for user: ${user.email}`);

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   *
   * Implements refresh token rotation:
   * 1. Validates the incoming refresh token
   * 2. Revokes it (single-use)
   * 3. Issues a new token pair
   *
   * If a revoked token is reused (replay attack), all tokens
   * for that user are revoked as a security precaution.
   */
  async refreshTokens(
    refreshToken: string,
  ): Promise<TokenPair & { user: UserWithoutPassword }> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Replay detection: if token was already revoked, an attacker may
    // have stolen it. Revoke the entire token family for this user.
    if (storedToken.revokedAt) {
      this.logger.warn(
        `Refresh token replay detected for user: ${storedToken.userId}`,
      );
      await this.revokeAllUserTokens(storedToken.userId);
      throw new UnauthorizedException('Token reuse detected');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const { password, ...userWithoutPassword } = storedToken.user;
    void password;

    // Rotate: revoke old token, generate new pair
    const newTokens = await this.generateTokenPair(userWithoutPassword);

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date(), replacedBy: newTokens.refresh_token },
    });

    return {
      ...newTokens,
      user: userWithoutPassword,
    };
  }

  /**
   * Revoke a specific refresh token (used during logout).
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      await this.prisma.refreshToken.update({
        where: { token },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Token may not exist (already revoked or invalid) — that's fine
    }
  }

  /**
   * Revoke all refresh tokens for a user (security event).
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.logger.warn(`All refresh tokens revoked for user: ${userId}`);
  }

  /**
   * Blacklist the current access token and revoke the refresh token.
   * Used during logout to ensure immediate session termination.
   */
  async logout(
    jti: string,
    userId: string,
    accessTokenExp: Date,
    refreshToken?: string,
  ): Promise<void> {
    // Blacklist the access token so it can't be used for the remaining lifetime
    await this.tokenBlacklistService.blacklist(
      jti,
      userId,
      accessTokenExp,
      'logout',
    );

    // Revoke the refresh token if provided
    if (refreshToken) {
      await this.revokeRefreshToken(refreshToken);
    }

    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Validates user credentials for Passport strategy.
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<UserWithoutPassword | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const { password: _password, ...userWithoutPassword } = user;
    void _password;
    return userWithoutPassword;
  }

  /**
   * Generate a short-lived access token + long-lived refresh token.
   */
  private async generateTokenPair(
    user: UserWithoutPassword,
  ): Promise<TokenPair> {
    const jti = crypto.randomUUID();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId ?? undefined,
      jti,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // Generate cryptographically random refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpirationDays);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
