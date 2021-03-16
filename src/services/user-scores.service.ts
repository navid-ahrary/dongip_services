import { injectable, BindingScope } from '@loopback/core';
import { repository } from '@loopback/repository';
import { Users } from '../models';
import { UsersRepository } from '../repositories';

@injectable({ scope: BindingScope.TRANSIENT })
export class UserScoresService {
  constructor(@repository(UsersRepository) private userRepo: UsersRepository) {}

  async getUserScores(userId: typeof Users.prototype.userId): Promise<number> {
    const scoresList = await this.userRepo.scores(userId).find();

    let totalScores = 0;
    scoresList.forEach((scoreItem) => {
      totalScores += scoreItem.score;
    });

    return totalScores;
  }
}
