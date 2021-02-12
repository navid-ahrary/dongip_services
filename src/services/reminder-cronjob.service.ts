import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import { service, BindingScope } from '@loopback/core';
import moment from 'moment';
import 'moment-timezone';
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

    const foundReminders = await this.remindersRepo.findOverrided({
      notifyTime: now.format('HH:mm:ss'),
      nextNotifyDate: now.format('YYYY-MM-DD'),
    });

    const userIds = _.map(foundReminders, (r) => r.userId);

    const users = await this.userRepo.find({
      fields: { userId: true, firebaseToken: true },
      where: { userId: { inq: [...userIds] }, firebaseToken: { nin: [undefined, 'null'] } },
      include: [{ relation: 'setting', scope: { fields: { userId: true, language: true } } }],
    });

    const notifyEntities: Array<Notifications> = [];
    const firebaseMessages: BatchMessage = [];
    for (const user of users) {
      const reminder = _.find(foundReminders, (r) => r.userId === user.getId());
      const lang = user.setting.language;

      const notif = new Notifications({
        userId: user.userId,
        title: reminder?.title ?? (lang === 'en' ? 'Reminder' : 'یادآوری'),
        body: reminder?.desc ?? ' ',
        createdAt: moment().format(),
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
