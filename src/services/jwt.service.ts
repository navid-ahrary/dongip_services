/* eslint-disable prefer-const */
import { TokenService } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { securityId } from '@loopback/security';
import { HttpErrors, RestBindings, Request } from '@loopback/rest';
import { repository } from '@loopback/repository';
import Ct from 'countries-and-timezones';
import { sign, verify, Algorithm } from 'jsonwebtoken';
import { UsersRepository, BlacklistRepository } from '../repositories';
import { EmailBindings, TokenServiceBindings } from '../keys';
import _ from 'lodash';
import { CurrentUserProfile } from '../interfaces';

export class JWTService implements TokenService {
  constructor(
    @inject(TokenServiceBindings.ACCESS_SECRET) private jwtSecret: string,
    @inject(TokenServiceBindings.TOKEN_ALGORITHM) private jwtAlgorithm: Algorithm,
    @inject(TokenServiceBindings.VERIFY_EXPIRES_IN) private verifyExpiresIn: string,
    @inject(TokenServiceBindings.ACCESS_EXPIRES_IN) private accessExpiresIn: string,
    @inject(EmailBindings.SUPPORT_EMAIL_ADDRESS) private supportEmailAdd: string,
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(BlacklistRepository) public blacklistRepository: BlacklistRepository,
  ) {}

  decryptedToken(accessToken: string) {
    return verify(accessToken, this.jwtSecret, {
      algorithms: [this.jwtAlgorithm],
    });
  }

  async verifyToken(accessToken: string): Promise<CurrentUserProfile> {
    // const lang = _.includes(this.req.headers['accept-language'], 'en') ? 'en' : 'fa';

    const nullToken = 'Error verifying access token: token is null';

    if (!accessToken) {
      console.error(new Date(), JSON.stringify(nullToken));
      throw new HttpErrors.Unauthorized(nullToken);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let decryptedData: any;

    let userProfile: CurrentUserProfile = { [securityId]: '' };
    // check token is not in blacklist
    const isBlacklisted = await this.blacklistRepository.exists(accessToken);
    if (isBlacklisted) {
      const errMsg = `Error verifying token: ${'توکن شما بلاک شده!'}`;
      console.error(errMsg);
      throw new HttpErrors.Unauthorized(errMsg);
    }

    // Decode user profile from token
    decryptedData = this.decryptedToken(accessToken);

    // In access audience, the user should exists in database certainly
    if (decryptedData.aud === 'access') {
      const userId = +(decryptedData.id ?? decryptedData.sub);
      const user = await this.usersRepository.findById(userId, {
        include: [
          { relation: 'usersRels', scope: { where: { type: 'self' } } },
          { relation: 'setting', scope: { fields: { userId: true, language: true } } },
        ],
      });

      if (!user.enabled) {
        const errMsg = `Your access is limited, Contact ${this.supportEmailAdd}`;
        console.error(errMsg);
        throw new HttpErrors.UnavailableForLegalReasons(errMsg);
      }

      _.assignIn(userProfile, {
        ..._.omit(user, ['userId', 'usersRels', 'setting']),
        language: user.setting.language,
        timezone: Ct.getTimezonesForCountry(user.region! ?? 'IR')[0].name,
        selfUserRelId: user.usersRels[0].userRelId,
      });
    }

    _.assignIn(userProfile, {
      [securityId]: decryptedData.id ?? decryptedData.sub,
      aud: decryptedData.aud,
      roles: decryptedData.roles,
    });

    return userProfile;
  }

  /**
   *
   * @param {CurrentUserProfile} userProfile
   * @return Promise string
   */
  public async generateToken(userProfile: CurrentUserProfile): Promise<string> {
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
