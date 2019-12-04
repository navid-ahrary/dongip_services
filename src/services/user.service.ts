import {UserService} from '@loopback/authentication';
import {User} from '../models';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {UsersRepository, Credentials} from '../repositories';
import {PasswordHasherBindings} from '../keys';
import {PasswordHasher} from './hash.password.bcryptjs';
import {securityId} from '@loopback/security';
import {HttpErrors} from '@loopback/rest';

export class MyUserService implements UserService<User, Credentials> {
  constructor(
    @repository(UsersRepository) public userRepository: UsersRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
  ) {}

  async verifyCredentials(credentials: Credentials): Promise<User> {
    const invalidCredentialsError = `Invalid phone or password.`;

    const foundUser = await this.userRepository.findOne({
      where: {phone: credentials.phone},
    });

    if (!foundUser) {
      throw new HttpErrors.NotFound(invalidCredentialsError);
    }
    const passwordMatched = await this.passwordHasher.comparePassword(
      credentials.password,
      foundUser.password,
    );

    if (!passwordMatched) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    return foundUser;
  }

  convertToUserProfile(user: User) {
    if (!user.phone || !user.password) {
      throw new HttpErrors.Unauthorized('phone/password are null');
    }

    return {[securityId]: user.id};
  }
}
