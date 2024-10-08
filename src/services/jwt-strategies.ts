import { AuthenticationStrategy, TokenService } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { LoggingBindings, WinstonLogger } from '@loopback/logging';
import { HttpErrors, Request } from '@loopback/rest';
import { UserProfile } from '@loopback/security';
import { TokenServiceBindings } from '../keys';

export class JWTAccessAutenticationStrategy implements AuthenticationStrategy {
  name = 'jwt.access';
  constructor(
    @inject(LoggingBindings.WINSTON_LOGGER) private logger: WinstonLogger,
    @inject(TokenServiceBindings.TOKEN_SERVICE) public jwtService: TokenService,
  ) {}

  public async authenticate(request: Request): Promise<UserProfile | undefined> {
    const token: string = this.extractCredentials(request);
    const userProfile: UserProfile = await this.jwtService.verifyToken(token);

    if (userProfile.aud !== 'access') {
      const errMsg = 'Access token is not provided!';

      this.logger.log('error', `Access token:: ${errMsg} ${userProfile}`);

      throw new HttpErrors.Unauthorized(errMsg);
    }
    return userProfile;
  }

  private extractCredentials(request: Request): string {
    if (!request.headers.authorization) {
      const errMsg = 'Authorization header not found.';

      this.logger.log('error', `Access token:: ${errMsg} ${request.headers.authorization}`);

      throw new HttpErrors.Unauthorized(errMsg);
    }

    // for example: Bearer xxx.yyy.zzz
    const authHeaderValue = request.headers.authorization;

    if (!authHeaderValue.startsWith('Bearer')) {
      const errMsg = 'Authorization header is not type of Bearer.';

      this.logger.log('error', `Access token:: ${errMsg} ${authHeaderValue}`);

      throw new HttpErrors.Unauthorized(errMsg);
    }

    // split the authHeaderValue into 2 parts, 'Bearer ' and the xxx.yyy.zzz
    const parts = authHeaderValue.split(' ');
    if (parts.length !== 2) {
      const errMsg =
        'Authorization header value must follow this pattern:' +
        " 'Bearer xxx.yyy.zzz' where xxx.yyy.zzz is a valid JWT token.";

      this.logger.log('error', `Access token:: ${errMsg} ${authHeaderValue}`);

      throw new HttpErrors.Unauthorized(errMsg);
    }
    const token = parts[1];

    return token;
  }
}

export class JWTVerifyAutenticationStrategy implements AuthenticationStrategy {
  name = 'jwt.verify';
  constructor(
    @inject(LoggingBindings.WINSTON_LOGGER) private logger: WinstonLogger,
    @inject(TokenServiceBindings.TOKEN_SERVICE) public jwtService: TokenService,
  ) {}

  public async authenticate(request: Request): Promise<UserProfile | undefined> {
    const token: string = this.extractCredentials(request);

    const userProfile: UserProfile = await this.jwtService.verifyToken(token);

    if (userProfile.aud !== 'verify') {
      const errMsg = 'Verify token is not provided!';

      this.logger.log('error', `Verify token:: ${errMsg} ${userProfile}`);

      throw new HttpErrors.Unauthorized(errMsg);
    }

    return userProfile;
  }

  private extractCredentials(request: Request): string {
    if (!request.headers.authorization) {
      const errMsg = 'Authorization header not found.';

      this.logger.log('error', `Verify token:: ${errMsg} ${request.headers.authorization}`);

      throw new HttpErrors.Unauthorized(errMsg);
    }

    // for example: Bearer xxx.yyy.zzz
    const authHeaderValue = request.headers.authorization;

    if (!authHeaderValue.startsWith('Bearer')) {
      const errMsg = 'Authorization header is not type of Bearer.';

      this.logger.log('error', `Verify token:: ${errMsg} ${authHeaderValue}`);

      throw new HttpErrors.Unauthorized(errMsg);
    }

    // split the authHeaderValue into 2 parts, 'Bearer ' and the xxx.yyy.zzz
    const parts = authHeaderValue.split(' ');
    if (parts.length !== 2) {
      const errMsg =
        'Authorization header value must follow this pattern:' +
        " 'Bearer xxx.yyy.zzz' where xxx.yyy.zzz is a valid JWT token.";

      this.logger.log('error', `Verify token:: ${errMsg} ${authHeaderValue}`);

      throw new HttpErrors.Unauthorized(errMsg);
    }
    const token = parts[1];

    return token;
  }
}
