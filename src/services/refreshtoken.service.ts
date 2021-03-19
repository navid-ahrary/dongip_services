import { injectable, inject, BindingScope } from '@loopback/core';
import { HttpErrors } from '@loopback/rest';
import { UserProfile, securityId } from '@loopback/security';
import { TokenService } from '@loopback/authentication';
import { TokenObject } from '@loopback/authentication-jwt';
import { repository } from '@loopback/repository';
import { sign, verify, Algorithm } from 'jsonwebtoken';

import { RefreshTokenServiceBindings, TokenServiceBindings, UserServiceBindings } from '../keys';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository';
import { MyUserService } from '.';

@injectable({ scope: BindingScope.REQUEST })
export class RefreshtokenService {
  constructor(
    @inject(TokenServiceBindings.TOKEN_ALGORITHM) private jwtAlgorithm: Algorithm,
    @inject(RefreshTokenServiceBindings.REFRESH_SECRET) private refreshSecret: string,
    @inject(RefreshTokenServiceBindings.REFRESH_EXPIRES_IN) private refreshExpiresIn: string,
    @repository(RefreshTokensRepository) public refreshTokenRepo: RefreshTokensRepository,
    @inject(TokenServiceBindings.TOKEN_SERVICE) public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE) public userService: MyUserService,
  ) {}

  /**
   * Verify the validity of a refresh token, and make sure it exists in backend.
   * @param refreshToken
   */
  async verifyToken(refreshToken: string): Promise<UserProfile> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decryptedToken: any = verify(refreshToken, this.refreshSecret, {
        algorithms: [this.jwtAlgorithm],
      });

      const userRefreshData = await this.refreshTokenRepo.findOne({
        where: { refreshToken: refreshToken, refreshId: +decryptedToken.jti },
      });

      if (!userRefreshData) {
        throw new Error('REFRESH_TOKEN_NOT_MATCHED');
      }

      const userProfile: UserProfile = {
        [securityId]: String(decryptedToken.id ?? decryptedToken.sub),
        aud: decryptedToken.aud,
        jti: +decryptedToken.jti,
      };

      return userProfile;
    } catch (error) {
      throw new HttpErrors.Unauthorized(`Error verifying token : ${error.message}`);
    }
  }

  /*
   * Refresh the access token bound with the given refresh token.
   */
  async refreshToken(refreshToken: string): Promise<TokenObject> {
    try {
      const userRefreshData = await this.verifyToken(refreshToken);
      const user = await this.userService.findUserById(+userRefreshData[securityId]);
      const userProfile: UserProfile = this.userService.convertToUserProfile(user);

      userProfile['aud'] = 'access';
      userProfile['roles'] = user.roles;
      // create a JSON Web Token based on the user profile
      const token = await this.jwtService.generateToken(userProfile);
      return { accessToken: token, refreshToken: refreshToken };
    } catch (error) {
      throw new HttpErrors.Unauthorized(`Error verifying token : ${error.message}`);
    }
  }

  /**
   * @param UserProfile userProfile
   * @param String accessToken
   * Generate a refresh token, bind it with the given user profile + access
   * token, then store them in backend.
   */

  async generateToken(userProfile: UserProfile, accessToken: string): Promise<TokenObject> {
    const data = { id: userProfile[securityId], name: userProfile.name };

    await this.revokeToken(+userProfile[securityId]);
    const refEnt = await this.refreshTokenRepo.create({
      refreshToken: ' ',
      userId: +userProfile[securityId],
    });

    const refreshToken = sign(data, this.refreshSecret, {
      audience: 'refresh',
      jwtid: refEnt.getId().toString(),
      algorithm: this.jwtAlgorithm,
      expiresIn: +this.refreshExpiresIn,
    });

    const result = { accessToken: accessToken, refreshToken: refreshToken };

    refEnt.refreshToken = refreshToken;
    await this.refreshTokenRepo.update(refEnt);

    return result;
  }

  async getToken(userProfile: UserProfile): Promise<{ refreshToken?: string }> {
    const userRefreshData = await this.refreshTokenRepo.findOne({
      where: { userId: +userProfile[securityId] },
    });

    return { refreshToken: userRefreshData?.refreshToken };
  }

  async revokeToken(userId: number) {
    try {
      await this.refreshTokenRepo.deleteAll({ userId: userId });
    } catch (err) {
      // ignore
    }
  }
}
