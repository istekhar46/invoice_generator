export interface JwtPayload {
  sub: string;
  email: string;
  displayName: string;
  iat?: number;
  exp?: number;
}
