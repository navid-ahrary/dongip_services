import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import { service, BindingScope } from '@loopback/core';
import moment from 'moment';
import 'moment-timezone';
import _ from 'lodash';
import { RemindersRepository, UsersRepository } from '../repositories';
import { FirebaseService, BatchMessage } from '.';

@cronJob({ scope: BindingScope.TRANSIENT })
export class ReminderCronjobService extends CronJob {
  TZ = process.env.TZ!;

  constructor(
    @repository(UsersRepository) public userRepo: UsersRepository,
    @repository(RemindersRepository) public remindersRepo: RemindersRepository,
    @service(FirebaseService) public firebaseService: FirebaseService,
  ) {
    super({
      name: 'reminderNotifyJob',
      cronTime: '0 0 8 * * *',
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
    const now = moment().tz(this.TZ);

    const foundReminders = await this.remindersRepo.findOverrided({
      notifyDate: now.format('YYYY-MM-DD'),
      notifyTime: now.format('HH:mm:ss'),
    });

    const userIds = _.map(foundReminders, (r) => r.userId);

    const users = await this.userRepo.find({
      fields: { userId: true, firebaseToken: true },
      where: { userId: { inq: [...userIds] }, firebaseToken: { nin: [undefined, 'null'] } },
      include: [{ relation: 'setting', scope: { fields: { userId: true, language: true } } }],
    });

    const firebaseMessages: BatchMessage = [];
    for (const user of users) {
      const reminder = _.find(foundReminders, (r) => r.userId === user.getId());
      const lang = user.setting.language;

      firebaseMessages.push({
        token: user.firebaseToken!,
        notification: {
          title: reminder?.title ?? (lang === 'en' ? 'Reminder' : 'یادآوری'),
          body: reminder?.desc ?? ' ',
        },
      });
    }

    if (firebaseMessages.length) {
      await this.firebaseService.sendAllMessage(firebaseMessages);

      const reminderIds = _.transform(foundReminders, (result: Array<number>, r) => {
        if (r.repeat) result.push(r.getId());
        return result;
      });
      await this.remindersRepo.updateOverride([...reminderIds]);
    }
  }
}
