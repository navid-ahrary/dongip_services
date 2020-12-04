import { AuthenticationStrategy, TokenService } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { UserProfile } from '@loopback/security';
import { HttpErrors, Request } from '@loopback/rest';

import { TokenServiceBindings } from '../keys';

export class JWTAccessAutehticationStrategy implements AuthenticationStrategy {
  name = 'jwt.access';
  constructor(@inject(TokenServiceBindings.TOKEN_SERVICE) public jwtService: TokenService) {}

  public async authenticate(request: Request): Promise<UserProfile | undefined> {
    const token: string = this.extractCredentials(request);
    const userProfile: UserProfile = await this.jwtService.verifyToken(token);

    if (userProfile.aud !== 'access') {
      const errMsg = 'Access token is not provided!';
      console.error(new Date(), 'Access token::', errMsg, userProfile);
      throw new HttpErrors.Unauthorized(errMsg);
    }
    return userProfile;
  }

  private extractCredentials(request: Request): string {
    if (!request.headers.authorization) {
      const errMsg = 'Authorization header not found.';
      console.error(new Date(), 'Access token::', errMsg, request);
      throw new HttpErrors.Unauthorized(errMsg);
    }

    // for example: Bearer xxx.yyy.zzz
    const authHeaderValue = request.headers.authorization;

    if (!authHeaderValue.startsWith('Bearer')) {
      const errMsg = 'Authorization header is not type of Bearer.';
      console.error(new Date(), 'Access token::', errMsg, authHeaderValue);
      throw new HttpErrors.Unauthorized(errMsg);
    }

    // split the authHeaderValue into 2 parts, 'Bearer ' and the xxx.yyy.zzz
    const parts = authHeaderValue.split(' ');
    if (parts.length !== 2) {
      const errMsg =
        'Authorization header value must follow this pattern:' +
        " 'Bearer xxx.yyy.zzz' where xxx.yyy.zzz is a valid JWT token.";
      console.error(new Date(), 'Access token::', errMsg, authHeaderValue);
      throw new HttpErrors.Unauthorized(errMsg);
    }
    const token = parts[1];

    return token;
  }
}

export class JWTVerifyAutehticationStrategy implements AuthenticationStrategy {
  name = 'jwt.verify';
  constructor(@inject(TokenServiceBindings.TOKEN_SERVICE) public jwtService: TokenService) {}

  public async authenticate(request: Request): Promise<UserProfile | undefined> {
    const token: string = this.extractCredentials(request);

    const userProfile: UserProfile = await this.jwtService.verifyToken(token);

    if (userProfile.aud !== 'verify') {
      const errMsg = 'Verify token is not provided!';
      console.error(new Date(), 'Verify token::', errMsg, userProfile);
      throw new HttpErrors.Unauthorized(errMsg);
    }

    return userProfile;
  }

  private extractCredentials(request: Request): string {
    if (!request.headers.authorization) {
      const errMsg = 'Authorization header not found.';
      console.error(new Date(), 'Verify token::', errMsg, request);
      throw new HttpErrors.Unauthorized(errMsg);
    }

    // for example: Bearer xxx.yyy.zzz
    const authHeaderValue = request.headers.authorization;

    if (!authHeaderValue.startsWith('Bearer')) {
      const errMsg = 'Authorization header is not type of Bearer.';
      console.error(new Date(), 'Verify token::', errMsg, authHeaderValue);
      throw new HttpErrors.Unauthorized(errMsg);
    }

    // split the authHeaderValue into 2 parts, 'Bearer ' and the xxx.yyy.zzz
    const parts = authHeaderValue.split(' ');
    if (parts.length !== 2) {
      const errMsg =
        'Authorization header value must follow this pattern:' +
        " 'Bearer xxx.yyy.zzz' where xxx.yyy.zzz is a valid JWT token.";
      console.error(new Date(), 'Verify token::', errMsg, authHeaderValue);
      throw new HttpErrors.Unauthorized(errMsg);
    }
    const token = parts[1];

    return token;
  }
}
