/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import {TokenService} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {UserProfile, securityId} from '@loopback/security';
import {HttpErrors} from '@loopback/rest';
import {repository} from '@loopback/repository';
import {sign, verify} from 'jsonwebtoken';
import {UsersRepository, BlacklistRepository} from '../repositories';
import {TokenServiceBindings} from '../keys';

export class JWTService implements TokenService {
  constructor (
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(BlacklistRepository)
    public blacklistRepository: BlacklistRepository,
    @inject(TokenServiceBindings.TOKEN_SECRET) private jwtSecret: string,
    @inject(TokenServiceBindings.VERIFY_TOKEN_EXPIRES_IN)
    private jwtVerifyExpiresIn: string,
    @inject(TokenServiceBindings.ACCESS_TOKEN_EXPIRES_IN)
    private jwtAccessExpiresIn: string,
    @inject(TokenServiceBindings.REFRESH_TOKEN_EXPIRES_IN)
    private jwtRefreshExpiresIn: string,
  ) {}

  public async verifyToken (accessToken: string): Promise<UserProfile> {
    if (!accessToken) {
      throw new HttpErrors.Unauthorized(
        'Error verifying access token: token is null'
      );
    }

    let userProfile: UserProfile,
      decryptedToken: any;

    try {
      // check token is not in blacklist
      await this.blacklistRepository.checkTokenNotBlacklisted(
        {
          where: {token: accessToken}
        }
      );

      //decode user profile from token
      decryptedToken = verify(accessToken, this.jwtSecret);
      userProfile = Object.assign(
        {[securityId]: '', aud: ''},
        {[securityId]: decryptedToken.sub, aud: decryptedToken.aud}
      );
    } catch (error) {
      throw new HttpErrors.Unauthorized(
        `Error verifying token: ${error.message}`);
    }

    return userProfile;
  }

  public async generateToken (userProfile: UserProfile): Promise<string> {
    if (!userProfile) {
      throw new HttpErrors.Unauthorized(
        'Error generating token, userPofile is null.');
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
        throw new HttpErrors.Unauthorized(
          'Error generating token, supported audience is not provided'
        );
    }

    //generate a JWT token
    let accessToken: string;
    try {
      accessToken = sign(userProfile, this.jwtSecret, {
        algorithm: 'HS512',
        expiresIn: expiresIn,
        subject: userProfile[securityId]
      });
    } catch (error) {
      throw new HttpErrors.Unauthorized(
        `Error generating token: ${error.message}`);
    }
    await this.verifyToken(accessToken);
    return accessToken;
  }
}
