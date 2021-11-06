import { BindingScope, inject, service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import ct from 'countries-and-timezones';
import moment from 'moment';
import 'moment-timezone';
import util from 'util';
import { AppInstanceBinding, HostnameBinding, LocMsgsBindings, TzBindings } from '../keys';
import { Notifications, Users } from '../models';
import { NotificationsRepository, RemindersRepository, UsersRepository } from '../repositories';
import { LocalizedMessages } from '../types';
import { BatchMessage, FirebaseService } from './firebase.service';

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

    const users = foundReminders.map(r2 => r2.user).filter(u => u instanceof Users);

    const notifyEntities: Array<Notifications> = [];
    const firebaseMessages: BatchMessage = [];
    for (const user of users) {
      const reminder = foundReminders.find(r => r.userId === user.userId);

      const name = user.name;
      const lang = user.setting.language;
      const userRegion = user.region;
      const userTZ = ct.getTimezonesForCountry(userRegion ?? 'IR')![0].name;

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
      const reminderIds = foundReminders.filter(r => r.repeat).map(r => r.reminderId);

      await this.remindersRepo.updateOverride(reminderIds);
    }
  }
}
