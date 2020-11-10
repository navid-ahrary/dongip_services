/* eslint-disable prefer-const */
import { TokenService } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { UserProfile, securityId } from '@loopback/security';
import { HttpErrors } from '@loopback/rest';
import { repository } from '@loopback/repository';
import { sign, verify, Algorithm } from 'jsonwebtoken';

import { UsersRepository, BlacklistRepository } from '../repositories';
import { TokenServiceBindings } from '../keys';

export class JWTService implements TokenService {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(BlacklistRepository) public blacklistRepository: BlacklistRepository,
    @inject(TokenServiceBindings.TOKEN_SECRET) private jwtSecret: string,
    @inject(TokenServiceBindings.TOKEN_ALGORITHM) private jwtAlgorithm: Algorithm,
    @inject(TokenServiceBindings.VERIFY_TOKEN_EXPIRES_IN) private jwtVerifyExpiresIn: string,
    @inject(TokenServiceBindings.ACCESS_TOKEN_EXPIRES_IN) private jwtAccessExpiresIn: string,
    @inject(TokenServiceBindings.REFRESH_TOKEN_EXPIRES_IN) private jwtRefreshExpiresIn: string,
  ) {}

  async verifyToken(accessToken: string): Promise<UserProfile> {
    const nullToken = 'Error verifying access token: token is null';

    if (!accessToken) {
      throw new HttpErrors.Unauthorized(nullToken);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let decryptedToken: any;
    let userProfile: UserProfile = { [securityId]: '' };

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
        const userId = +decryptedToken.sub;
        const user = await this.usersRepository.findById(userId, {
          fields: {
            userId: true,
            phone: true,
            name: true,
            email: true,
            region: true,
            firebaseToken: true,
          },
        });

        if (!user) throw new Error('User is not exists');

        userProfile = Object.assign(userProfile, {
          phone: user.phone,
          email: user.email,
          name: user.name,
          region: user.region,
          firebaseToken: user.firebaseToken,
        });
      }

      userProfile = Object.assign(userProfile, {
        [securityId]: decryptedToken.sub,
        aud: decryptedToken.aud,
        roles: decryptedToken.roles,
      });
    } catch (err) {
      throw new HttpErrors.Unauthorized(`Error verifying token: ${err.message}`);
    }

    return userProfile;
  }

  /**
   *
   * @param userProfile UserProfile
   * @return Promise string
   */
  public async generateToken(userProfile: UserProfile): Promise<string> {
    const nullUserProfle = 'Error generating token, userPofile is null.',
      nullAudience = 'Error generating token, supported audience is not provided';

    if (!userProfile) {
      throw new HttpErrors.Unauthorized(nullUserProfle);
    }

    let expiresIn: number;

    if (userProfile.aud === 'verify') {
      expiresIn = +this.jwtVerifyExpiresIn;
    } else if (userProfile.aud === 'access') {
      expiresIn = +this.jwtAccessExpiresIn;
    } else if (userProfile.aud === 'refresh') {
      expiresIn = +this.jwtRefreshExpiresIn;
    } else throw new HttpErrors.Unauthorized(nullAudience);

    try {
      const generatedToken = sign(userProfile, this.jwtSecret, {
        algorithm: this.jwtAlgorithm,
        expiresIn: expiresIn,
        subject: userProfile[securityId].toString(),
      });

      return generatedToken;
    } catch (err) {
      throw new HttpErrors.Unauthorized(`Error generating verify token: ${err.message}`);
    }
  }
}
