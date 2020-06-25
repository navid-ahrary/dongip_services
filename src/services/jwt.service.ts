/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import {TokenService} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {UserProfile, securityId} from '@loopback/security';
import {HttpErrors} from '@loopback/rest';
import {repository} from '@loopback/repository';
import {sign, verify, Algorithm} from 'jsonwebtoken';

import {UsersRepository, BlacklistRepository} from '../repositories';
import {TokenServiceBindings} from '../keys';

export class JWTService implements TokenService {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(BlacklistRepository)
    public blacklistRepository: BlacklistRepository,
    @inject(TokenServiceBindings.TOKEN_SECRET) private jwtSecret: string,
    @inject(TokenServiceBindings.TOKEN_ALGORITHM)
    private jwtAlgorithm: Algorithm,
    @inject(TokenServiceBindings.VERIFY_TOKEN_EXPIRES_IN)
    private jwtVerifyExpiresIn: string,
    @inject(TokenServiceBindings.ACCESS_TOKEN_EXPIRES_IN)
    private jwtAccessExpiresIn: string,
    @inject(TokenServiceBindings.REFRESH_TOKEN_EXPIRES_IN)
    private jwtRefreshExpiresIn: string,
  ) {}

  public async verifyToken(accessToken: string): Promise<UserProfile> {
    const nullToken = 'Error verifying access token: token is null';

    if (!accessToken) {
      throw new HttpErrors.Unauthorized(nullToken);
    }

    let userProfile: UserProfile, decryptedToken: any;

    try {
      // check token is not in blacklist
      const isBlacklisted = await this.blacklistRepository.exists(accessToken);
      if (isBlacklisted) throw new Error('توکن شما بلاک شده!');

      // Decode user profile from token
      decryptedToken = verify(accessToken, this.jwtSecret, {
        algorithms: [this.jwtAlgorithm],
      });

      // In access audience, the user should exists in database certainly
      if (decryptedToken.aud === 'access') {
        const userId = Number(decryptedToken.sub);
        const isExistUser = await this.usersRepository.exists(userId);

        if (!isExistUser) throw new Error('User is not exists');
      }

      userProfile = Object.assign(
        {},
        {
          [securityId]: decryptedToken.sub,
          aud: decryptedToken.aud,
          roles: decryptedToken.roles,
        },
      );
    } catch (err) {
      throw new HttpErrors.Unauthorized(
        `Error verifying token: ${err.message}`,
      );
    }

    return userProfile;
  }

  public async generateToken(userProfile: UserProfile): Promise<string> {
    const nullUserProfle = 'Error generating token, userPofile is null.',
      nullAudience =
        'Error generating token, supported audience is not provided';

    if (!userProfile) {
      throw new HttpErrors.Unauthorized(nullUserProfle);
    }
    let expiresIn;

    switch (userProfile.aud) {
      case 'verify':
        expiresIn = +this.jwtVerifyExpiresIn;
        break;
      case 'access':
        expiresIn = +this.jwtAccessExpiresIn;
        break;
      case 'refresh':
        expiresIn = +this.jwtRefreshExpiresIn;
        break;
      default:
        throw new HttpErrors.Unauthorized(nullAudience);
    }

    //generate a JWT token
    try {
      const generatedToken = sign(userProfile, this.jwtSecret, {
        algorithm: this.jwtAlgorithm,
        expiresIn: expiresIn,
        subject: String(userProfile[securityId]),
      });

      return generatedToken;
    } catch (err) {
      throw new HttpErrors.Unauthorized(
        `Error generating token: ${err.message}`,
      );
    }
  }
}
