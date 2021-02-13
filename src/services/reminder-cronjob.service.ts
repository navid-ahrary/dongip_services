import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import { service, BindingScope } from '@loopback/core';
import moment from 'moment';
import 'moment-timezone';
import ct from 'countries-and-timezones';
import _ from 'lodash';
import { NotificationsRepository, RemindersRepository, UsersRepository } from '../repositories';
import { FirebaseService, BatchMessage } from '.';
import { Notifications } from '../models';

@cronJob({ scope: BindingScope.TRANSIENT })
export class ReminderCronjobService extends CronJob {
  TZ = process.env.TZ!;

  constructor(
    @repository(UsersRepository) public userRepo: UsersRepository,
    @repository(RemindersRepository) public remindersRepo: RemindersRepository,
    @repository(NotificationsRepository) public notifRepo: NotificationsRepository,
    @service(FirebaseService) public firebaseService: FirebaseService,
  ) {
    super({
      name: 'reminderNotifyJob',
      cronTime: '0 */30 * * * *',
      start: true,
      timeZone: process.env.TZ,
      onTick: async () => {
        if (
          _.isUndefined(process.env.NODE_APP_INSTANCE) ||
          (process.env.NODE_APP_INSTANCE === '1' && process.env.HOSTNAME === 'dongip_1')
        ) {
          await this._sendReminderNotify();
        }
      },
    });
  }

  private async _sendReminderNotify() {
    const now = moment().tz(this.TZ).startOf('minute');

    const foundReminders = await this.remindersRepo.find({
      where: { notifyTime: now.format('HH:mm:ss'), nextNotifyDate: now.format('YYYY-MM-DD') },
      include: [
        {
          relation: 'user',
          scope: {
            fields: { userId: true, firebaseToken: true, region: true },
            where: { firebaseToken: { nin: [undefined, 'null'] } },
            include: [{ relation: 'setting', scope: { fields: { userId: true, language: true } } }],
          },
        },
      ],
    });

    const users = _.map(
      _.filter(foundReminders, (r1) => typeof r1.user === 'object'),
      (r2) => r2.user,
    );

    const notifyEntities: Array<Notifications> = [];
    const firebaseMessages: BatchMessage = [];
    for (const user of users) {
      const reminder = _.find(foundReminders, (r) => r.userId === user.userId);

      const lang = user.setting.language;
      const userRegion = user.region;
      const userTZ = ct.getTimezonesForCountry(userRegion ?? 'IR')[0].name;

      const notif = new Notifications({
        userId: user.userId,
        title: reminder?.title ?? (lang === 'en' ? 'Reminder' : 'یادآوری'),
        body: reminder?.desc ?? ' ',
        createdAt: moment.tz(userTZ).format('YYYY-MM-DDTHH:mm:ss+00:00'),
        type: 'reminder',
      });
      notifyEntities.push(notif);

      firebaseMessages.push({
        token: user.firebaseToken!,
        notification: {
          title: notif.title,
          body: notif.body,
        },
      });
    }

    if (firebaseMessages.length) await this.firebaseService.sendAllMessage(firebaseMessages);

    if (notifyEntities.length) await this.notifRepo.createAll(notifyEntities);

    if (foundReminders.length) {
      const reminderIds = _.map(
        _.filter(foundReminders, (r) => r.repeat),
        (r) => r.reminderId,
      );

      await this.remindersRepo.updateOverride([...reminderIds]);
    }
  }
}
