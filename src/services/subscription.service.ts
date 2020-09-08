import {bind, BindingScope, inject, service} from '@loopback/core';
import {repository, DataObject} from '@loopback/repository';
import {UsersRepository, SubscriptionsRepository} from '../repositories';

import moment from 'moment';
import dotenv from 'dotenv';
dotenv.config();

import {Users, Subscriptions, Notifications} from '../models';
import {SubscriptionSpec} from '../application';
import {FirebaseService, MessagePayload} from './firebase.service';

@bind({scope: BindingScope.SINGLETON})
export class SubscriptionService {
  constructor(
    @repository(UsersRepository) public usersRepo: UsersRepository,
    @repository(SubscriptionsRepository)
    public subscRepo: SubscriptionsRepository,
    @inject('application.subscriptionSpec') public subsSpec: SubscriptionSpec,
    @service(FirebaseService) protected firebasseService: FirebaseService,
  ) {}

  async getCurrentState(
    userId: typeof Users.prototype.userId,
  ): Promise<Subscriptions> {
    const foundSubsc = await this.usersRepo.subscriptions(userId).find({
      where: {
        solTime: {lte: moment.utc().toISOString()},
        eolTime: {gte: moment.utc().toISOString()},
      },
    });

    return foundSubsc[0];
  }

  async performSubscription(
    userId: typeof Users.prototype.userId,
    planId: string,
  ): Promise<Subscriptions> {
    const durationAmount = this.subsSpec.plans[planId].duration.amount;
    const durationUnit = this.subsSpec.plans[planId].duration.unit;

    let solTimeUTCISO = moment.utc().toISOString();
    let eolTimeUTCISO = moment
      .utc()
      .add(durationAmount, durationUnit)
      .toISOString();

    const currentSubsc = await this.getCurrentState(userId);

    if (currentSubsc) {
      const currentSubsEol = currentSubsc.eolTime;

      solTimeUTCISO = currentSubsEol;
      eolTimeUTCISO = moment
        .utc(currentSubsEol)
        .add(durationAmount, durationUnit)
        .toISOString();
    }

    const subsc = await this.usersRepo.subscriptions(userId).create({
      planId: planId,
      solTime: solTimeUTCISO,
      eolTime: eolTimeUTCISO,
    });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.usersRepo.updateById(userId, {roles: ['GOLD']});

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.sendNotification(userId, subsc);

    return subsc;
  }

  async sendNotification(
    userId: typeof Users.prototype.userId,
    entity: Subscriptions,
  ) {
    const notifyData: DataObject<Notifications> = {
      type: 'subscription',
      title: this.subsSpec.plans[entity.planId].description['fa'],
      body: 'شما کاربر طلایی دنگیپ هستید. تمام امکانات در اختیار شماست.',
    };

    const notify = await this.usersRepo
      .notifications(userId)
      .create(notifyData);

    const user = await this.usersRepo.findById(userId, {
      fields: {firebaseToken: true},
    });

    const notifyPayload: MessagePayload = {
      notification: {clickAction: 'FLUTTER_NOTIFICATION_CLICK'},
    };
    await this.firebasseService.sendToDeviceMessage(
      user.firebaseToken,
      notifyPayload,
    );
  }

  convertTomansToRials(value: number): number {
    return +(String(value) + '0');
  }

  convertRialsToTomans(value: number): number {
    return +String(value).slice(0, -1);
  }
}
