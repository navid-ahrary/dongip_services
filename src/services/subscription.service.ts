import { BindingScope, inject, injectable, service } from '@loopback/core';
import { repository } from '@loopback/repository';
import Moment from 'moment';
import { UsersRepository, SubscriptionsRepository } from '../repositories';
import { Users, Subscriptions } from '../models';
import { LocalizedMessages, SubscriptionSpec } from '../types';
import { LocMsgsBindings, SubsSpecBindings } from '../keys';
import { FirebaseService, MessagePayload } from './firebase.service';

@injectable({ scope: BindingScope.TRANSIENT })
export class SubscriptionService {
  constructor(
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(SubsSpecBindings) public subsSpec: SubscriptionSpec,
    @service(FirebaseService) public firebaseService: FirebaseService,
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

  public async sendNotification(
    userId: typeof Users.prototype.userId,
    subscription: Subscriptions,
  ) {
    const user = await this.usersRepo.findById(userId, {
      fields: { firebaseToken: true, userId: true, setting: true },
      include: [{ relation: 'setting' }],
    });

    const lang = user.setting.language;
    const planId = subscription.planId;

    const createdNotify = await this.usersRepo.notifications(userId).create({
      userId: userId,
      type: 'subscription',
      title: this.locMsg['PLAN_ID'][lang][planId],
      body: this.locMsg['SUBSCRIPTION_NOTIFY_BODY'][lang],
    });

    const notifyPayload: MessagePayload = {
      notification: {
        title: createdNotify.title,
        body: createdNotify.body,
      },
      data: {
        notifyId: createdNotify.getId().toString(),
        type: createdNotify.type,
        title: createdNotify.title,
        body: createdNotify.body,
        subscriptionId: subscription.getId().toString(),
        solTime: subscription.solTime.toString(),
        eolTime: subscription.eolTime.toString(),
      },
    };

    await this.firebaseService.sendToDeviceMessage(user.firebaseToken!, notifyPayload);
  }
}
