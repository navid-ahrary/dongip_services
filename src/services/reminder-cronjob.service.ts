import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import { service, BindingScope, inject } from '@loopback/core';
import moment from 'moment';
import 'moment-timezone';
import ct from 'countries-and-timezones';
import _ from 'lodash';
import util from 'util';
import { NotificationsRepository, RemindersRepository, UsersRepository } from '../repositories';
import { FirebaseService, BatchMessage } from '.';
import { Notifications, Users } from '../models';
import { LocalizedMessages } from '../types';
import { AppInstanceBinding, HostnameBinding, LocMsgsBindings, TzBindings } from '../keys';

@cronJob({ scope: BindingScope.APPLICATION })
export class ReminderCronjobService extends CronJob {
  TZ: string;

  constructor(
    @inject(TzBindings) timezone: string,
    @inject(HostnameBinding) hostname: string,
    @inject(AppInstanceBinding) nodeAppInstance: string,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @service(FirebaseService) public firebaseService: FirebaseService,
    @repository(UsersRepository) public userRepo: UsersRepository,
    @repository(RemindersRepository) public remindersRepo: RemindersRepository,
    @repository(NotificationsRepository) public notifRepo: NotificationsRepository,
  ) {
    super({
      name: 'reminderNotifyJob',
      cronTime: '0 */15 * * * *',
      start: true,
      timeZone: timezone,
      onTick: async () => {
        if (nodeAppInstance === '0' && hostname === 'dongip_1') {
          await this._sendReminderNotify();
        }
      },
    });

    this.TZ = timezone;
  }

  private async _sendReminderNotify() {
    const now = moment().tz(this.TZ).startOf('minute');

    const foundReminders = await this.remindersRepo.find({
      where: {
        enabled: true,
        notifyTime: now.format('HH:mm:ss'),
        nextNotifyDate: now.format('YYYY-MM-DD'),
      },
      include: [
        {
          relation: 'user',
          scope: {
            fields: { userId: true, firebaseToken: true, region: true, name: true },
            where: { firebaseToken: { nin: [undefined, 'null'] } },
            include: [{ relation: 'setting', scope: { fields: { userId: true, language: true } } }],
          },
        },
      ],
    });

    const users = _.filter(
      _.map(foundReminders, (r2) => r2.user),
      (u) => u instanceof Users,
    );

    const notifyEntities: Array<Notifications> = [];
    const firebaseMessages: BatchMessage = [];
    for (const user of users) {
      const reminder = _.find(foundReminders, (r) => r.userId === user.userId);

      const name = user.name;
      const lang = user.setting.language;
      const userRegion = user.region;
      const userTZ = ct.getTimezonesForCountry(userRegion ?? 'IR')[0].name;

      const notif = new Notifications({
        type: 'reminder',
        userId: user.userId,
        title: util.format(this.locMsg['REMINDER_TITLE'][lang], name),
        body: reminder?.title ?? (lang === 'en' ? 'Reminder' : 'یادآوری'),
        createdAt: moment.tz(userTZ).format('YYYY-MM-DDTHH:mm:ss+00:00'),
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

      await this.remindersRepo.updateOverride(reminderIds);
    }
  }
}
