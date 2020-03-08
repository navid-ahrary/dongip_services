/* eslint-disable @typescript-eslint/no-explicit-any */
import {UserService} from '@loopback/authentication';
import {Users, Credentials} from '../models';
import {repository} from '@loopback/repository';
import {UsersRepository} from '../repositories';
import {securityId} from '@loopback/security';
import {HttpErrors} from '@loopback/rest';

export class MyUserService implements UserService<Users, Credentials> {
  constructor(
    @repository(UsersRepository) public userRepository: UsersRepository,
  ) {}

  isMatched(str1: string, str2: string) {
    const isMatched = str1 === str2 ? true : false;
    return isMatched;
  }

  async verifyCredentials(credentials: Credentials): Promise<Users> {
    const invalidCredentialsError = 'Invalid phone/password !';

    const foundUser = await this.userRepository.findOne({
      where: {phone: credentials.phone},
    });

    if (!foundUser) {
      throw new HttpErrors.NotFound(invalidCredentialsError);
    }

    // const passwordMatched = this.isMatched(
    //   credentials.password,
    //   foundUser.password,
    // )

    // if ( !passwordMatched ) {
    //   throw new HttpErrors.Unauthorized( invalidCredentialsError )
    // }

    return foundUser;
  }

  convertToUserProfile(user: Users) {
    if (!user.phone) {
      throw new HttpErrors.Unauthorized('phone is null');
    }

    return {
      [securityId]: user.getId(),
      accountType: user.accountType,
    };
  }
}
