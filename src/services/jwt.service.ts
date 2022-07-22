/* eslint-disable prefer-const */
import { TokenService } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { LoggingBindings, WinstonLogger } from '@loopback/logging';
import { repository } from '@loopback/repository';
import { HttpErrors } from '@loopback/rest';
import { securityId, UserProfile } from '@loopback/security';
import ct from 'countries-and-timezones';
import { Algorithm, sign, verify } from 'jsonwebtoken';
import _ from 'lodash';
import { EmailBindings, TokenServiceBindings, UserServiceBindings } from '../keys';
import { Settings, UsersRels } from '../models';
import { BlacklistRepository, UsersRepository } from '../repositories';
import { MyUserService } from './user.service';

export interface CurrentUserProfile extends UserProfile {
  selfUserRelId?: typeof UsersRels.prototype.userId;
  language?: typeof Settings.prototype.language;
  timezone?: string;
  totalScores?: number;
  primaryAccountId?: number;
  aud?: string;
  roles?: string[];
  createdAt?: Date;
  deleted?: boolean;
  username?: string | null;
  phone?: string;
  email?: string;
  name?: string;
  avatar?: string;
  registeredAt?: string;
  firebaseToken?: string | null;
  userAgent?: string | null;
  platform?: string | null;
  region?: string | null;
  phoneLocked?: boolean;
  emailLocked?: boolean;
  referralCode?: string | null;
  appVersion?: string | null;
  enabled?: boolean;
  marketplace?: string | null;
  isCompleted?: boolean;
}

export class JWTService implements TokenService {
  constructor(
    @inject(LoggingBindings.WINSTON_LOGGER) private logger: WinstonLogger,
    @inject(TokenServiceBindings.ACCESS_SECRET) private jwtSecret: string,
    @inject(TokenServiceBindings.TOKEN_ALGORITHM) private jwtAlgorithm: Algorithm,
    @inject(TokenServiceBindings.VERIFY_EXPIRES_IN) private verifyExpiresIn: string,
    @inject(TokenServiceBindings.ACCESS_EXPIRES_IN) private accessExpiresIn: string,
    @inject(EmailBindings.SUPPORT_EMAIL_ADDRESS) private supportEmailAdd: string,
    @inject(UserServiceBindings.USER_SERVICE) private userService: MyUserService,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(BlacklistRepository) public blacklistRepository: BlacklistRepository,
  ) {}

  decryptedToken(accessToken: string) {
    return verify(accessToken, this.jwtSecret, {
      algorithms: [this.jwtAlgorithm],
    });
  }

  async verifyToken(accessToken: string): Promise<CurrentUserProfile> {
    try {
      const nullToken = 'Error verifying access token: token is null';

      if (!accessToken) {
        this.logger.log('error', nullToken);

        throw new HttpErrors.Unauthorized(nullToken);
      }

      // check token is not in blacklist
      const isBlacklisted = await this.blacklistRepository.exists(accessToken);
      if (isBlacklisted) {
        const errMsg = `Error verifying token: ${'توکن شما بلاک شده!'}`;
        this.logger.log('error', errMsg);

        throw new Error(errMsg);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decryptedData = <any>this.decryptedToken(accessToken);

      let userProfile: CurrentUserProfile = {
        [securityId]: decryptedData.id ?? decryptedData.sub,
        aud: decryptedData.aud,
        roles: decryptedData.roles,
      };

      // In access audience, the user should exists in database certainly
      if (decryptedData.aud === 'access') {
        const userId = decryptedData.id;
        const user = await this.userService.findUserById(userId);

        if (!user.enabled) {
          const errMsg = `Your access is limited, Contact ${this.supportEmailAdd}`;
          this.logger.log('error', errMsg);

          throw new HttpErrors.UnavailableForLegalReasons(errMsg);
        }

        Object.assign(userProfile, {
          ..._.omit(user, ['userId', 'usersRels', 'setting', 'scores', 'accounts']),
          language: user.setting.language,
          timezone: ct.getTimezonesForCountry(user.region ?? 'IR')![0].name,
          selfUserRelId: user.usersRels[0].getId(),
          totalScores: this.userService.calculateTotalScores(user.scores),
          primaryAccountId: user.accounts[0].getId(),
        });
      }

      return userProfile;
    } catch (err) {
      this.logger.log('error', JSON.stringify(err));

      throw new HttpErrors.Unauthorized(`Error verifying token: ${err.message}`);
    }
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
        this.logger.log('error', nullAudience);
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
      const errMsg = `Error generating verify token: ${err.message}`;
      this.logger.log('error', errMsg);

      throw new HttpErrors.Unauthorized(errMsg);
    }
  }
}
