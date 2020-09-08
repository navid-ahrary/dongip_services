import {bind, BindingScope, inject} from '@loopback/core';
import {repository} from '@loopback/repository';

import moment from 'moment';
import dotenv from 'dotenv';
dotenv.config();

import {UsersRepository, SubscriptionsRepository} from '../repositories';
import {SubscriptionSpec} from '../application';
import {Users} from '../models';

@bind({scope: BindingScope.SINGLETON})
export class SubscriptionService {
  constructor(
    @repository(UsersRepository) protected usersRepo: UsersRepository,
    @repository(SubscriptionsRepository)
    protected subsRepo: SubscriptionsRepository,
    @inject('application.subscriptionSpec')
    protected subsSpec: SubscriptionSpec,
  ) {}

  async getCurrentState(userId: typeof Users.prototype.userId) {
    return this.subsRepo.findOne({
      where: {
        userId: userId,
        solTime: {lte: moment.utc().toISOString()},
        eolTime: {gte: moment.utc().toISOString()},
      },
    });
  }

  /** Perform subsciption on user
   *
   * @param userId number
   * @param planId string
   *
   * @returns {Promise} string
   */
  async performSubscription(
    userId: typeof Users.prototype.userId,
    planId: string,
  ) {
    const durationAmount = this.subsSpec.plans[planId].duration.amount;
    const durationUnit = this.subsSpec.plans[planId].duration.unit;

    let sol: string, eol: string;

    const currentSubs = await this.getCurrentState(userId);
    // If user has a subscription, new plan'll start from subscriptino's eol
    if (currentSubs) {
      const currentEOL = currentSubs.eolTime;

      sol = currentEOL;
      eol = moment(currentEOL).add(durationAmount, durationUnit).toISOString();
    } else {
      sol = moment.utc().toISOString();
      eol = moment.utc().add(durationAmount, durationUnit).toISOString();
    }

    const subs = await this.usersRepo
      .subscriptions(userId)
      .create({planId: planId, solTime: sol, eolTime: eol});

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.usersRepo.updateById(userId, {roles: ['GOLD']});

    return subs;
  }
}
