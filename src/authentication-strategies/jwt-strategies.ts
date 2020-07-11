import {AuthenticationStrategy, TokenService} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {UserProfile} from '@loopback/security';
import {HttpErrors, Request} from '@loopback/rest';

import {TokenServiceBindings} from '../keys';

export class JWTAccessAutehticationStrategy implements AuthenticationStrategy {
  name = 'jwt.access';

  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService,
  ) {}

  public async authenticate(
    request: Request,
  ): Promise<UserProfile | undefined> {
    const token: string = this.extractCredentials(request);
    const userProfile: UserProfile = await this.tokenService.verifyToken(token);

    if (userProfile.aud !== 'access') {
      throw new HttpErrors.Unauthorized('Access token is not provided!');
    }
    return userProfile;
  }

  private extractCredentials(request: Request): string {
    if (!request.headers.authorization) {
      throw new HttpErrors.Unauthorized('Authorization header not found.');
    }

    // for example: Bearer xxx.yyy.zzz
    const authHeaderValue = request.headers.authorization;

    if (!authHeaderValue.startsWith('Bearer')) {
      throw new HttpErrors.Unauthorized(
        'Authorization header is not type of Bearer.',
      );
    }

    // split the authHeaderValue into 2 parts, 'Bearer ' and the xxx.yyy.zzz
    const parts = authHeaderValue.split(' ');
    if (parts.length !== 2) {
      throw new HttpErrors.Unauthorized(
        'Authorization header value must follow this pattern:' +
          " 'Bearer xxx.yyy.zzz' where xxx.yyy.zzz is a valid JWT token.",
      );
    }
    const token = parts[1];

    return token;
  }
}

export class JWTRefreshAutehticationStrategy implements AuthenticationStrategy {
  name = 'jwt.refresh';

  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService,
  ) {}

  public async authenticate(
    request: Request,
  ): Promise<UserProfile | undefined> {
    const token: string = this.extractCredentials(request);
    const userProfile: UserProfile = await this.tokenService.verifyToken(token);

    if (userProfile.aud !== 'refresh') {
      throw new HttpErrors.Unauthorized('Refresh token is not provided!');
    }
    return userProfile;
  }

  private extractCredentials(request: Request): string {
    if (!request.headers.authorization) {
      throw new HttpErrors.Unauthorized('Authorization header not found.');
    }

    // for example: Bearer xxx.yyy.zzz
    const authHeaderValue = request.headers.authorization;

    if (!authHeaderValue.startsWith('Bearer')) {
      throw new HttpErrors.Unauthorized(
        'Authorization header is not type of Bearer.',
      );
    }

    // split the authHeaderValue into 2 parts, 'Bearer ' and the xxx.yyy.zzz
    const parts = authHeaderValue.split(' ');
    if (parts.length !== 2) {
      throw new HttpErrors.Unauthorized(
        'Authorization header value must follow this pattern:' +
          " 'Bearer xxx.yyy.zzz' where xxx.yyy.zzz is a valid JWT token.",
      );
    }
    const token = parts[1];

    return token;
  }
}

export class JWTVerifyAutehticationStrategy implements AuthenticationStrategy {
  name = 'jwt.verify';

  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService,
  ) {}

  public async authenticate(
    request: Request,
  ): Promise<UserProfile | undefined> {
    const token: string = this.extractCredentials(request);

    const userProfile: UserProfile = await this.tokenService.verifyToken(token);

    if (userProfile.aud !== 'verify') {
      throw new HttpErrors.Unauthorized('Verify token is not provided!');
    }

    return userProfile;
  }

  private extractCredentials(request: Request): string {
    if (!request.headers.authorization) {
      throw new HttpErrors.Unauthorized('Authorization header not found.');
    }

    // for example: Bearer xxx.yyy.zzz
    const authHeaderValue = request.headers.authorization;

    if (!authHeaderValue.startsWith('Bearer')) {
      throw new HttpErrors.Unauthorized(
        'Authorization header is not type of Bearer.',
      );
    }

    // split the authHeaderValue into 2 parts, 'Bearer ' and the xxx.yyy.zzz
    const parts = authHeaderValue.split(' ');
    if (parts.length !== 2) {
      throw new HttpErrors.Unauthorized(
        'Authorization header value must follow this pattern:' +
          " 'Bearer xxx.yyy.zzz' where xxx.yyy.zzz is a valid JWT token.",
      );
    }
    const token = parts[1];

    return token;
  }
}
