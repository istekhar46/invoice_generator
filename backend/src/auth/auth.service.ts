import {
  Injectable,
  UnauthorizedException,
  ConflictException,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, displayName } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
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

    return {
      user: plainToClass(UserResponseDto, user, { excludeExtraneousValues: true }),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

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
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        // Clean up expired token
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new UnauthorizedException('Refresh token expired');
      }

      // Invalidate the old refresh token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      // Generate new tokens
      const tokens = await this.generateTokens(storedToken.user);

      return {
        user: plainToClass(UserResponseDto, storedToken.user, { excludeExtraneousValues: true }),
        ...tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
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
      // Invalidate the specific refresh token
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
    } else {
      // Invalidate all refresh tokens for the user (logout from all devices)
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    // Clean up expired refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}