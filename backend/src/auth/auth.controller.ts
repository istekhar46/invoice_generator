import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
  private readonly REFRESH_TOKEN_COOKIE_OPTIONS;

  /**
   * Initialize AuthController with configurable cookie settings
   * 
   * Cookie configuration is read from environment variables:
   * - COOKIE_DOMAIN: Domain for the cookie (optional, defaults to current domain)
   * - COOKIE_PATH: Path for the cookie (default: /api/v1/auth/refresh)
   * - COOKIE_SECURE: Whether to use secure flag (default: true in production, false in dev)
   * - COOKIE_SAME_SITE: SameSite attribute (default: strict, options: strict/lax/none)
   * - COOKIE_MAX_AGE: Max age in milliseconds (default: 7 days)
   */
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    // Configure refresh token cookie options from environment variables
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    
    // Get cookie configuration from environment with sensible defaults
    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN'); // undefined = current domain
    const cookiePath = this.configService.get<string>('COOKIE_PATH', '/api/v1/auth/refresh');
    const cookieSecure = this.configService.get<string>('COOKIE_SECURE', isProduction ? 'true' : 'false') === 'true';
    const cookieSameSite = this.configService.get<'strict' | 'lax' | 'none'>('COOKIE_SAME_SITE', 'strict');
    const cookieMaxAge = parseInt(this.configService.get<string>('COOKIE_MAX_AGE', String(7 * 24 * 60 * 60 * 1000)), 10);
    
    this.REFRESH_TOKEN_COOKIE_OPTIONS = {
      httpOnly: true, // Always true for security
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: cookiePath,
      maxAge: cookieMaxAge,
      ...(cookieDomain && { domain: cookieDomain }), // Only set domain if provided
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    // Extract IP address from request
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    
    const { authResponse, refreshToken } = await this.authService.register(registerDto, ipAddress);
    
    // Set refresh token as HttpOnly cookie
    res.cookie(
      this.REFRESH_TOKEN_COOKIE_NAME,
      refreshToken,
      this.REFRESH_TOKEN_COOKIE_OPTIONS,
    );

    return authResponse;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    // Extract IP address from request
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    
    const { authResponse, refreshToken } = await this.authService.login(loginDto, ipAddress);
    
    // Set refresh token as HttpOnly cookie
    res.cookie(
      this.REFRESH_TOKEN_COOKIE_NAME,
      refreshToken,
      this.REFRESH_TOKEN_COOKIE_OPTIONS,
    );

    return authResponse;
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Google OAuth',
  })
  async googleAuth() {
    // This method initiates the Google OAuth flow
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to frontend with tokens',
  })
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const { authResponse } = req.user as { authResponse: AuthResponseDto; refreshToken: string };
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    
    // Redirect to frontend with only access token as query parameter
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${authResponse.accessToken}`;
    res.redirect(redirectUrl);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    // Try to get refresh token from cookie first, then fall back to body (backward compatibility)
    const refreshToken = req.cookies?.[this.REFRESH_TOKEN_COOKIE_NAME] || refreshTokenDto.refreshToken;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const { authResponse, refreshToken: newRefreshToken } = await this.authService.refreshToken(refreshToken);
    
    // Set new refresh token as HttpOnly cookie
    res.cookie(
      this.REFRESH_TOKEN_COOKIE_NAME,
      newRefreshToken,
      this.REFRESH_TOKEN_COOKIE_OPTIONS,
    );

    return authResponse;
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout user from all sessions' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out from all sessions',
  })
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Invalidate all user refresh tokens in database
    await this.authService.logout(user.id);
    
    // Clear refresh token cookie by setting Max-Age=0
    res.cookie(this.REFRESH_TOKEN_COOKIE_NAME, '', {
      ...this.REFRESH_TOKEN_COOKIE_OPTIONS,
      maxAge: 0,
    });
    
    return { message: 'Successfully logged out' };
  }
}