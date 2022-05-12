import { BindingScope, inject, service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import ct from 'countries-and-timezones';
import _ from 'lodash';
import moment from 'moment-timezone';
import util from 'util';
import { LocMsgsBindings } from '../keys';
import { Notifications } from '../models';
import { NotificationsRepository, RemindersRepository, UsersRepository } from '../repositories';
import { LocalizedMessages } from '../types';
import { BatchMessage, FirebaseService } from './firebase.service';

const TZ: string = process.env.TZ ?? 'utc';

@cronJob({ scope: BindingScope.APPLICATION })
export class ReminderCronjobService extends CronJob {
  constructor(
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @service(FirebaseService) public firebaseService: FirebaseService,
    @repository(UsersRepository) public userRepo: UsersRepository,
    @repository(RemindersRepository) public remindersRepo: RemindersRepository,
    @repository(NotificationsRepository) public notifRepo: NotificationsRepository,
  ) {
    super({
      name: 'reminderNotifyJob',
      cronTime: '3 */15 * * * *',
      start: true,
      timeZone: TZ,
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onTick: async () => {
        if (_.isUndefined(process.env.NODE_APP_INSTANCE) || process.env.NODE_APP_INSTANCE === '0') {
          await this.sendReminderNotify();
        }
      },
    });
  }

  private async sendReminderNotify() {
    const now = moment().tz(TZ).startOf('minute');

    const sqlStatment = `
      SELECT r.*, u.firebase_token, u.region, u.name, s.language
      FROM reminders AS r
      INNER JOIN users AS u ON r.user_id = u.id
      INNER JOIN settings AS s ON r.user_id = s.user_id
      WHERE r.enabled = 1 AND notify_time = ? AND next_notify_date = ?
        AND u.firebase_token NOT IN ('null') AND u.firebase_token IS NOT NULL
        AND s.language IS NOT NULL AND u.region IS NOT NULL
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foundReminders = <any[]>(
      await this.remindersRepo.execute(sqlStatment, [now.format('HH:mm'), now.format('YYYY-MM-DD')])
    );

    const notifyEntities: Array<Notifications> = [];
    const firebaseMessages: BatchMessage = [];
    for (const reminder of foundReminders) {
      const name = reminder.name;
      const lang = reminder.language;
      const userRegion = reminder.region;
      const userTZ = ct.getTimezonesForCountry(userRegion ?? 'IR')![0].name;

      const notif = new Notifications({
        type: 'reminder',
        userId: reminder.user_id,
        title: util.format(this.locMsg['REMINDER_TITLE'][lang], name),
        body: reminder?.title ?? (lang === 'en' ? 'Reminder' : 'یادآوری'),
        createdAt: moment.tz(userTZ).format('YYYY-MM-DDTHH:mm:ss+00:00'),
      });
      notifyEntities.push(notif);

      firebaseMessages.push({
        token: reminder.firebase_token ?? ' ',
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
