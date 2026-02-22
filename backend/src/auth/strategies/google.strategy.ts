import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

export interface GoogleUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
  }

  /**
   * Override authorizationParams() to inject the `prompt` parameter into
   * the Google authorization URL.
   *
   * Setting `prompt` in the constructor options is silently ignored because
   * passport-google-oauth20 does not map it in its own authorizationParams().
   * The correct hook is this method — passport-oauth2 calls it when building
   * the redirect URL to Google's consent endpoint.
   *
   * prompt=select_account → Google always shows the account picker, even when
   * the user already has an active Google session (prevents silent auto-login).
   */
  override authorizationParams(options: Record<string, unknown>): object {
    const base = (super.authorizationParams as (o: Record<string, unknown>) => object)(options);
    return { ...base, prompt: 'select_account' };
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, displayName, photos } = profile;

    const googleUser: GoogleUser = {
      id,
      email: emails[0].value,
      displayName,
      photoURL: photos?.[0]?.value,
    };

    const user = await this.authService.googleLogin(googleUser);
    done(null, user);
  }
}
