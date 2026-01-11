import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { GoogleUser } from './strategies/google.strategy';
import { plainToClass } from 'class-transformer';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // Cache for tracking recently deleted tokens to detect reuse
  // Maps token hash -> { userId, tokenId, deletedAt }
  private readonly deletedTokensCache = new Map<string, { userId: string; tokenId: string; deletedAt: Date }>();
  private readonly DELETED_TOKEN_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Clean up expired cache entries periodically
    setInterval(() => this.cleanupDeletedTokensCache(), 60 * 60 * 1000); // Every hour
  }

  async register(registerDto: RegisterDto, ipAddress?: string): Promise<AuthResponseDto> {
    const { email, password, displayName } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Log authentication failure
      this.logger.warn(
        `Registration failed - User already exists - ` +
        `Email: ${email}, ` +
        `Reason: Email already registered, ` +
        `IP: ${ipAddress || 'unknown'}, ` +
        `Timestamp: ${new Date().toISOString()}`
      );
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Log successful registration (treated as a login event)
    this.logger.log(
      `User registered and logged in successfully - ` +
      `User ID: ${user.id}, ` +
      `Email: ${user.email}, ` +
      `IP: ${ipAddress || 'unknown'}, ` +
      `Timestamp: ${new Date().toISOString()}`
    );

    return {
      user: plainToClass(UserResponseDto, user, { excludeExtraneousValues: true }),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      // Log authentication failure
      this.logger.warn(
        `Authentication failed - Invalid credentials - ` +
        `Email: ${email}, ` +
        `Reason: User not found or no password set, ` +
        `IP: ${ipAddress || 'unknown'}, ` +
        `Timestamp: ${new Date().toISOString()}`
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Log authentication failure
      this.logger.warn(
        `Authentication failed - Invalid credentials - ` +
        `Email: ${email}, ` +
        `Reason: Invalid password, ` +
        `IP: ${ipAddress || 'unknown'}, ` +
        `Timestamp: ${new Date().toISOString()}`
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Log successful login
    this.logger.log(
      `User logged in successfully - ` +
      `User ID: ${user.id}, ` +
      `Email: ${user.email}, ` +
      `IP: ${ipAddress || 'unknown'}, ` +
      `Timestamp: ${new Date().toISOString()}`
    );

    return {
      user: plainToClass(UserResponseDto, user, { excludeExtraneousValues: true }),
      ...tokens,
    };
  }

  async googleLogin(googleUser: GoogleUser): Promise<AuthResponseDto> {
    let user = await this.prisma.user.findUnique({
      where: { googleId: googleUser.id },
    });

    if (!user) {
      // Check if user exists with same email
      const existingUser = await this.prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (existingUser) {
        // Link Google account to existing user
        user = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            googleId: googleUser.id,
            ...(googleUser.photoURL && { photoURL: googleUser.photoURL }),
          },
        });
      } else {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            email: googleUser.email,
            displayName: googleUser.displayName,
            googleId: googleUser.id,
            ...(googleUser.photoURL && { photoURL: googleUser.photoURL }),
          },
        });
      }
    } else {
      // Update existing Google user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          displayName: googleUser.displayName,
          ...(googleUser.photoURL && { photoURL: googleUser.photoURL }),
        },
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: plainToClass(UserResponseDto, user, { excludeExtraneousValues: true }),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      // Check if the refresh token exists in the database and is not expired
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        // Token not found - this could be a reuse attempt
        await this.handleTokenReuse(refreshToken);
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        // Clean up expired token
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        
        // Log authentication failure
        this.logger.warn(
          `Token refresh failed - Expired token - ` +
          `User ID: ${storedToken.userId}, ` +
          `Reason: Refresh token expired, ` +
          `Timestamp: ${new Date().toISOString()}`
        );
        
        throw new UnauthorizedException('Refresh token expired');
      }

      // Track this token before deletion for reuse detection
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      this.deletedTokensCache.set(tokenHash, {
        userId: storedToken.userId,
        tokenId: storedToken.id,
        deletedAt: new Date(),
      });

      // Invalidate the old refresh token (rotation)
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      // Generate new tokens
      const tokens = await this.generateTokens(storedToken.user);

      // Log successful token refresh
      this.logger.log(
        `Token refreshed successfully - ` +
        `User ID: ${storedToken.user.id}, ` +
        `Email: ${storedToken.user.email}, ` +
        `Timestamp: ${new Date().toISOString()}`
      );

      return {
        user: plainToClass(UserResponseDto, storedToken.user, { excludeExtraneousValues: true }),
        ...tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Log authentication failure for unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        `Token refresh failed - Unexpected error - ` +
        `Reason: ${errorMessage}, ` +
        `Timestamp: ${new Date().toISOString()}`,
        errorStack
      );
      
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Handle refresh token reuse detection
   * When a deleted token is reused, invalidate all user tokens and log security warning
   */
  private async handleTokenReuse(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Check if this token was recently deleted (indicating reuse)
    const deletedTokenInfo = this.deletedTokensCache.get(tokenHash);
    
    if (deletedTokenInfo) {
      // Token reuse detected! This is a security incident
      this.logger.warn(
        `SECURITY: Refresh token reuse detected - ` +
        `User ID: ${deletedTokenInfo.userId}, ` +
        `Token ID: ${deletedTokenInfo.tokenId}, ` +
        `Timestamp: ${new Date().toISOString()}, ` +
        `Original deletion: ${deletedTokenInfo.deletedAt.toISOString()}`
      );

      // Invalidate ALL refresh tokens for this user as a security measure
      const result = await this.prisma.refreshToken.deleteMany({
        where: { userId: deletedTokenInfo.userId },
      });

      this.logger.warn(
        `SECURITY: Invalidated ${result.count} refresh token(s) for user ${deletedTokenInfo.userId} due to token reuse`
      );

      // Remove from cache after handling
      this.deletedTokensCache.delete(tokenHash);
    } else {
      // Token not found in cache - could be invalid, expired long ago, or fake
      this.logger.warn(
        `Invalid refresh token attempt - Token hash: ${tokenHash.substring(0, 16)}..., ` +
        `Timestamp: ${new Date().toISOString()}`
      );
    }
  }

  /**
   * Clean up expired entries from the deleted tokens cache
   */
  private cleanupDeletedTokensCache(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [tokenHash, info] of this.deletedTokensCache.entries()) {
      const age = now.getTime() - info.deletedAt.getTime();
      if (age > this.DELETED_TOKEN_CACHE_TTL) {
        this.deletedTokensCache.delete(tokenHash);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired entries from deleted tokens cache`);
    }
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
  }

  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
    };

    // Use the default JWT service for access token (configured in module)
    const accessToken = await this.jwtService.signAsync(payload);
    
    // Generate a secure random refresh token
    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    
    // Calculate expiration date
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const expiresAt = new Date();
    
    // Parse expiration time (simple parsing for common formats)
    if (expiresIn.endsWith('d')) {
      const days = parseInt(expiresIn.slice(0, -1));
      expiresAt.setDate(expiresAt.getDate() + days);
    } else if (expiresIn.endsWith('h')) {
      const hours = parseInt(expiresIn.slice(0, -1));
      expiresAt.setHours(expiresAt.getHours() + hours);
    } else if (expiresIn.endsWith('m')) {
      const minutes = parseInt(expiresIn.slice(0, -1));
      expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
    } else {
      // Default to 7 days if format is not recognized
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Find the token before deleting to track it
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (storedToken) {
        // Track this token before deletion for reuse detection
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        this.deletedTokensCache.set(tokenHash, {
          userId: storedToken.userId,
          tokenId: storedToken.id,
          deletedAt: new Date(),
        });
      }

      // Invalidate the specific refresh token
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
    } else {
      // Get all tokens before deleting to track them
      const tokens = await this.prisma.refreshToken.findMany({
        where: { userId },
      });

      // Track all tokens before deletion
      for (const token of tokens) {
        const tokenHash = crypto.createHash('sha256').update(token.token).digest('hex');
        this.deletedTokensCache.set(tokenHash, {
          userId: token.userId,
          tokenId: token.id,
          deletedAt: new Date(),
        });
      }

      // Invalidate all refresh tokens for the user (logout from all devices)
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    // Clean up expired refresh tokens
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    // Log the cleanup operation
    this.logger.log(
      `Expired tokens cleanup completed - ` +
      `Tokens removed: ${result.count}, ` +
      `Timestamp: ${new Date().toISOString()}`
    );
  }
}