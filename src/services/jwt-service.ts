import {TokenService} from '@loopback/authentication';
import {promisify} from 'util';
import {TokenServiceBindings} from '../keys';
import {inject} from '@loopback/core';
import {UserProfile} from '@loopback/security';
import {HttpErrors} from '@loopback/rest';

const jwt = require('jsonwebtoken');
const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);

export class JWTService implements TokenService {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SECRET) private jwtSecret: string,
    @inject(TokenServiceBindings.TOKEN_EXPIRES_IN) private jwtExpiresIn: string,
  ) {}

  async verifyToken(token: string): Promise<UserProfile> {
    if (!token) {
      throw new HttpErrors.Unauthorized(
        `Error verifying token: 'token' is null`,
      );
    }

    let userProfile: UserProfile;

    try {
      //decode user profile from token
      const decryptedToken = await verifyAsync(token, this.jwtSecret);
      // don't copy over  token field 'iat' and 'exp', nor 'email' to user profile
      userProfile = Object.assign(
        {id: '', name: ''},
        {id: decryptedToken.id, name: decryptedToken.name},
      );
    } catch (error) {
      throw new HttpErrors.Unauthorized(
        `Error verifying token: ${error.message}`,
      );
    }

    return userProfile;
  }

  async generateToken(userProfile: UserProfile): Promise<string> {
    if (!userProfile) {
      throw new HttpErrors.Unauthorized(
        `Error generating token, userPofile is null.`,
      );
    }

    //generate a JWT token
    let token: string;

    try {
      token = signAsync(userProfile, this.jwtSecret, {
        expiresIn: +this.jwtExpiresIn,
      });
    } catch (error) {
      throw new HttpErrors.Unauthorized(
        `Error generating token: ${error.message}`,
      );
    }

    return token;
  }
}
