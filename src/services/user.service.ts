/* eslint-disable @typescript-eslint/no-explicit-any */
import {UserService} from '@loopback/authentication';
import {repository} from '@loopback/repository';
import {securityId} from '@loopback/security';
import {HttpErrors} from '@loopback/rest';
import {inject} from '@loopback/core';

import {Users, Credentials} from '../models';
import {UsersRepository} from '../repositories';
import {PasswordHasherBindings} from '../keys';
import {PasswordHasher} from '../services';

export class MyUserService implements UserService<Users, Credentials> {
  constructor(
    @repository(UsersRepository) public userRepository: UsersRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
  ) {}

  async verifyCredentials(credentials: Credentials): Promise<Users> {
    const invalidCredentialsError = 'Invalid phone !';

    const foundUser = await this.userRepository.findOne({
      where: {phone: credentials.phone},
    });

    if (!foundUser) {
      throw new HttpErrors.NotFound(invalidCredentialsError);
    }

    return foundUser;
  }

  convertToUserProfile(user: Users) {
    if (!user.phone) {
      throw new HttpErrors.Unauthorized('phone is null');
    }

    return {
      [securityId]: user.getId(),
      roles: user.roles,
    };
  }
}
