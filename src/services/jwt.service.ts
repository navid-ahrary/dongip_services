import {TokenService} from '@loopback/authentication';
import {promisify} from 'util';
import {TokenServiceBindings} from '../keys';
import {inject} from '@loopback/core';
import {UserProfile, securityId} from '@loopback/security';
import {HttpErrors} from '@loopback/rest';
import {repository} from '@loopback/repository';
import {UsersRepository} from '../repositories';

const jwt = require('jsonwebtoken');
const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);

export class JWTService implements TokenService {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @inject(TokenServiceBindings.TOKEN_SECRET) private jwtSecret: string,
    @inject(TokenServiceBindings.TOKEN_EXPIRES_IN) private jwtExpiresIn: string,
    @inject(TokenServiceBindings.TOKEN_ALGORITHM) private jwtAlgorithm: string,
  ) {}

  async verifyToken(token: string): Promise<UserProfile> {
    if (!token) {
      throw new HttpErrors.Unauthorized(`Error verifying token: 'token' is null`);
    }

    let userProfile: UserProfile;

    try {
      //decode user profile from token
      const decryptedToken = await verifyAsync(token, this.jwtSecret);

      const user = await this.usersRepository.findById(decryptedToken.sub);

      if (token !== user.token) {
        throw new HttpErrors.Unauthorized('Token is not valid');
      }

      // don't copy over  token field 'iat' and 'exp', nor 'email' to user profile
      userProfile = Object.assign({[securityId]: ''}, {[securityId]: decryptedToken.sub});
    } catch (error) {
      throw new HttpErrors.Unauthorized(`Error verifying token: ${error.message}`);
    }

    return userProfile;
  }

  async generateToken(userProfile: UserProfile): Promise<string> {
    if (!userProfile) {
      throw new HttpErrors.Unauthorized('Error generating token, userPofile is null.');
    }
    const id: string = userProfile[securityId].toString();

    userProfile['type'] = 'trial';

    //generate a JWT token
    let token: string;

    try {
      token = signAsync(userProfile, this.jwtSecret, {
        algorithm: this.jwtAlgorithm,
        expiresIn: +this.jwtExpiresIn,
        subject: id,
      });
    } catch (error) {
      throw new HttpErrors.Unauthorized(`Error generating token: ${error.message}`);
    }

    return token;
  }
}
