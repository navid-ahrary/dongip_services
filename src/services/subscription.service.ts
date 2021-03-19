import { BindingScope, inject, injectable } from '@loopback/core';
import { repository } from '@loopback/repository';
import Moment from 'moment';
import { UsersRepository, SubscriptionsRepository } from '../repositories';
import { Users, Subscriptions } from '../models';
import { SubscriptionSpec } from '../types';
import { SubsSpecBindings } from '../keys';

@injectable({ scope: BindingScope.TRANSIENT })
export class SubscriptionService {
  constructor(
    @inject(SubsSpecBindings) public subsSpec: SubscriptionSpec,
    @repository(UsersRepository) public usersRepo: UsersRepository,
    @repository(SubscriptionsRepository) public subsRepo: SubscriptionsRepository,
  ) {}

  /** Perform subsciption on user
   *
   * @param {Number} userId
   * @param {String} planId
   *
   * @returns string
   */
  async performSubscription(
    userId: typeof Users.prototype.userId,
    planId: string,
    purchaseTime: moment.Moment,
  ): Promise<Subscriptions> {
    const durationAmount = this.subsSpec.plans[planId].period.amount,
      durationUnit = this.subsSpec.plans[planId].period.unit;

    const lastSubs = await this.subsRepo.findOne({
      order: ['eolTime DESC'],
      fields: { eolTime: true },
      where: {
        userId: userId,
        eolTime: { gte: Moment.utc().toISOString() },
      },
    });

    let sol: string, eol: string;
    // If user has a subscription, new plan'll start from subscription's eol
    if (lastSubs) {
      const lastEOL = lastSubs.eolTime;

      sol = Moment(lastEOL).utc().toISOString();
      eol = Moment(lastEOL).utc().add(durationAmount, durationUnit).toISOString();
    } else {
      sol = Moment(purchaseTime).utc().toISOString();
      eol = Moment(purchaseTime).utc().add(durationAmount, durationUnit).toISOString();
    }

    const subs = await this.usersRepo
      .subscriptions(userId)
      .create({ planId: planId, solTime: sol, eolTime: eol });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.usersRepo.updateById(userId, { roles: ['GOLD'] });

    return subs;
  }
}
