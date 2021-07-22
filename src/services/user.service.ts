/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserService } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import { HttpErrors } from '@loopback/rest';
import { securityId, UserProfile } from '@loopback/security';
import { PasswordHasherBindings } from '../keys';
import { Credentials, Users } from '../models';
import { UsersRepository } from '../repositories';
import { PasswordHasher } from '../services';

export class MyUserService implements UserService<Users, Credentials> {
  constructor(
    @repository(UsersRepository) private userRepository: UsersRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER) private passwordHasher: PasswordHasher,
  ) {}

  async verifyCredentials(credentials: Credentials): Promise<Users> {
    const invalidCredentialsError = 'USER_NOT_FOUND';
    let foundUser: Users | null;

    if (credentials.phone) {
      foundUser = await this.userRepository.findOne({
        where: { phone: credentials.phone, deleted: false },
      });
    } else {
      foundUser = await this.userRepository.findOne({
        where: { email: credentials.email, deleted: false },
      });
    }

    if (!foundUser) {
      throw new Error(invalidCredentialsError);
    }

    return foundUser;
  }

  convertToUserProfile(user: Users): UserProfile {
    return {
      [securityId]: user.getId(),
      name: user.name,
    };
  }

  async findUserById(id: typeof Users.prototype.userId): Promise<Users> {
    const userNotfound = 'invalid User';
    const foundUser = await this.userRepository.findOne({
      where: { userId: id, deleted: false },
    });

    if (!foundUser) {
      throw new HttpErrors.Unauthorized(userNotfound);
    }
    return foundUser;
  }
}
