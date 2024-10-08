/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserService } from '@loopback/authentication';
import { repository } from '@loopback/repository';
import { securityId, UserProfile } from '@loopback/security';
import { Credentials, Scores, Users } from '../models';
import { UsersRepository } from '../repositories';

export class MyUserService implements UserService<Users, Credentials> {
  constructor(@repository(UsersRepository) private userRepository: UsersRepository) {}

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
      include: [
        {
          relation: 'usersRels',
          scope: {
            where: {
              type: 'self',
              deleted: false,
            },
          },
        },
        {
          relation: 'setting',
          scope: {
            fields: {
              userId: true,
              language: true,
              deleted: false,
            },
          },
        },
        {
          relation: 'scores',
          scope: {
            where: {
              deleted: false,
            },
          },
        },
        {
          relation: 'accounts',
          scope: {
            fields: { userId: true, accountId: true },
            where: {
              isPrimary: true,
              deleted: false,
            },
          },
        },
      ],
    });

    if (!foundUser) throw new Error(userNotfound);

    // Assign to each user that have not primary account
    if (!foundUser.accounts) {
      const createdPrimAccount = await this.userRepository
        .accounts(id)
        .create({ isPrimary: true, title: 'default', icon: 'unknown' });

      foundUser.accounts = [createdPrimAccount];
    }

    return foundUser;
  }

  public calculateTotalScores(scoresList: Scores[]): number {
    let totalScores = 0;
    scoresList?.forEach(scoreItem => {
      totalScores += scoreItem.score;
    });
    return totalScores;
  }
}
