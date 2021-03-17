/* eslint-disable prefer-const */
import { TokenService } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { UserProfile, securityId } from '@loopback/security';
import { HttpErrors } from '@loopback/rest';
import { repository } from '@loopback/repository';
import Ct from 'countries-and-timezones';
import { sign, verify, Algorithm } from 'jsonwebtoken';
import { UsersRepository, BlacklistRepository } from '../repositories';
import { TokenServiceBindings } from '../keys';

export class JWTService implements TokenService {
  constructor(
    @inject(TokenServiceBindings.ACCESS_SECRET) private jwtSecret: string,
    @inject(TokenServiceBindings.TOKEN_ALGORITHM) private jwtAlgorithm: Algorithm,
    @inject(TokenServiceBindings.VERIFY_EXPIRES_IN) private verifyExpiresIn: string,
    @inject(TokenServiceBindings.ACCESS_EXPIRES_IN) private accessExpiresIn: string,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(BlacklistRepository) public blacklistRepository: BlacklistRepository,
  ) {}

  decryptedToken(accessToken: string) {
    return verify(accessToken, this.jwtSecret, {
      algorithms: [this.jwtAlgorithm],
    });
  }

  async verifyToken(accessToken: string): Promise<UserProfile> {
    const nullToken = 'Error verifying access token: token is null';

    if (!accessToken) {
      console.error(new Date(), JSON.stringify(nullToken));
      throw new HttpErrors.Unauthorized(nullToken);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let decryptedData: any;
    let userProfile: UserProfile = { [securityId]: '' };

    try {
      // check token is not in blacklist
      const isBlacklisted = await this.blacklistRepository.exists(accessToken);
      if (isBlacklisted) throw new Error('توکن شما بلاک شده!');

      // Decode user profile from token
      decryptedData = this.decryptedToken(accessToken);

      // In access audience, the user should exists in database certainly
      if (decryptedData.aud === 'access') {
        const userId = +(decryptedData.id ?? decryptedData.sub);
        const user = await this.usersRepository.findById(userId, {
          fields: {
            userId: true,
            phone: true,
            name: true,
            email: true,
            region: true,
            firebaseToken: true,
          },
          include: [
            { relation: 'usersRels', scope: { where: { type: 'self' } } },
            { relation: 'setting', scope: { fields: { userId: true, language: true } } },
          ],
        });

        Object.assign(userProfile, {
          phone: user.phone,
          email: user.email,
          name: user.name,
          region: user.region,
          language: user.setting.language,
          timezone: Ct.getTimezonesForCountry(user.region! ?? 'IR')[0].name,
          selfUserRelId: user.usersRels[0].userRelId,
          firebaseToken: user.firebaseToken,
        });
      }

      Object.assign(userProfile, {
        [securityId]: decryptedData.id ?? decryptedData.sub,
        aud: decryptedData.aud,
        roles: decryptedData.roles,
      });
    } catch (err) {
      console.error(new Date(), JSON.stringify(err));
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
    const nullAudience = 'Error generating token, supported audience is not provided';

    const aud = userProfile.aud;
    let expiresIn: number;
    switch (aud) {
      case 'verify':
        expiresIn = +this.verifyExpiresIn;
        break;
      case 'access':
        expiresIn = +this.accessExpiresIn;
        break;
      default:
        console.error(new Date(), JSON.stringify(nullAudience));
        throw new HttpErrors.Unauthorized(nullAudience);
    }

    const data = {
      id: +userProfile[securityId],
      name: userProfile.name,
      roles: userProfile['roles'],
    };
    try {
      const generatedToken = sign(data, this.jwtSecret, {
        algorithm: this.jwtAlgorithm,
        expiresIn: expiresIn,
        audience: aud,
      });

      return generatedToken;
    } catch (err) {
      console.error(new Date(), JSON.stringify(err));
      throw new HttpErrors.Unauthorized(`Error generating verify token: ${err.message}`);
    }
  }
}
