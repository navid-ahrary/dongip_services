import {bind, BindingScope, inject} from '@loopback/core';
import {repository} from '@loopback/repository';

import moment from 'moment';
import dotenv from 'dotenv';
dotenv.config();

import {UsersRepository, SubscriptionsRepository} from '../repositories';
import {SubscriptionSpec} from '../application';
import {Users, Subscriptions} from '../models';

@bind({scope: BindingScope.SINGLETON})
export class SubscriptionService {
  constructor(
    @repository(UsersRepository) protected usersRepo: UsersRepository,
    @repository(SubscriptionsRepository)
    protected subsRepo: SubscriptionsRepository,
    @inject('application.subscriptionSpec')
    protected subsSpec: SubscriptionSpec,
  ) {}

  async getLastState(
    userId: typeof Users.prototype.userId,
  ): Promise<Partial<Subscriptions> | null> {
    return this.subsRepo.findOne({
      order: ['eolTime DESC'],
      limit: 1,
      fields: {userId: true, solTime: true, eolTime: true},
      where: {
        userId: userId,
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
    purchaseTime: moment.Moment,
  ): Promise<Subscriptions> {
    const durationAmount = this.subsSpec.plans[planId].duration.amount;
    const durationUnit = this.subsSpec.plans[planId].duration.unit;

    let sol: string, eol: string;

    const lastSubs = await this.getLastState(userId);
    // If user has a subscription, new plan'll start from subscriptino's eol
    if (lastSubs) {
      const lastEOL = lastSubs.eolTime;

      sol = moment(lastEOL).utc().toISOString();
      eol = moment(lastEOL)
        .utc()
        .add(durationAmount, durationUnit)
        .toISOString();
    } else {
      sol = moment(purchaseTime).utc().toISOString();
      eol = moment(purchaseTime)
        .utc()
        .add(durationAmount, durationUnit)
        .toISOString();
    }

    const subs = await this.usersRepo
      .subscriptions(userId)
      .create({planId: planId, solTime: sol, eolTime: eol});

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.usersRepo.updateById(userId, {roles: ['GOLD']});

    return subs;
  }
}
