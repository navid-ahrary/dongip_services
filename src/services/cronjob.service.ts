import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import { service, BindingScope, inject } from '@loopback/core';
import moment from 'moment';

import { RemindersRepository, SettingsRepository, UsersRepository } from '../repositories';
import { FirebaseService, BatchMessage } from '../services';
import { LocalizedMessages } from '../application';

@cronJob({ scope: BindingScope.TRANSIENT })
export class CronJobService extends CronJob {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(SettingsRepository) public settingsRepository: SettingsRepository,
    @repository(RemindersRepository) public remindersRepo: RemindersRepository,
    @service(FirebaseService) public firebaseService: FirebaseService,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
  ) {
    super({
      name: 'reminderNotifyJob',
      cronTime: '0 */10 * * * *',
      start: true,
      onTick: async () => {
        if (
          process.env.NODE_APP_INSTANCE === undefined ||
          (process.env.NODE_APP_INSTANCE === '0' && process.env.HOSTNAME === 'dongip_1')
        ) {
          await this.sendDailyNotify();
          await this.sendReminderNotify();
        }
      },
    });
  }

  private async sendDailyNotify() {
    const firebaseMessages: BatchMessage = [];
    const utcTime = moment().isDST() ? moment.utc() : moment.utc().subtract(1, 'hour');

    const foundSettings = await this.settingsRepository.find({
      fields: { userId: true, language: true },
      where: {
        scheduleNotify: true,
        scheduleTime: {
          between: [
            utcTime.startOf('minute').subtract(4, 'minutes').format('HH:mm:ss.00000'),
            utcTime.startOf('minute').add(5, 'minutes').format('HH:mm:ss.00000'),
          ],
        },
      },
      include: [
        {
          relation: 'user',
          scope: {
            fields: { userId: true, firebaseToken: true },
            where: { firebaseToken: { neq: null } },
          },
        },
      ],
    });

    for (const setting of foundSettings) {
      if (setting.user) {
        const lang = setting.language;
        const notifyTitle = this.locMsg['DAILY_NOTIFY_TITLE'][lang];
        const notifyBody = this.locMsg['DAILY_NOTIFY_BODY'][lang];

        firebaseMessages.push({
          token: setting.user.firebaseToken!,
          notification: { title: notifyTitle, body: notifyBody },
        });
      }
    }

    if (firebaseMessages.length) await this.firebaseService.sendAllMessage(firebaseMessages);
  }

  private async sendReminderNotify() {
    const firebaseMessages: BatchMessage = [];
    const utcTime = moment().isDST() ? moment.utc() : moment.utc().subtract(1, 'hour');

    const foundReminders = await this.remindersRepo.find({
      where: {
        repeat: true,
        nextNotifyDate: utcTime.format('YYYY-MM-DD'),
        notifyTime: {
          between: [
            utcTime.startOf('minute').subtract(4, 'minutes').format('HH:mm:ss.00000'),
            utcTime.startOf('minute').add(5, 'minutes').format('HH:mm:ss.00000'),
          ],
        },
      },
      include: [
        {
          relation: 'user',
          scope: {
            fields: { userId: true, firebaseToken: true },
            where: { firebaseToken: { neq: null } },
            include: [
              {
                relation: 'setting',
                scope: { fields: { language: true, userId: true, settingId: true } },
              },
            ],
          },
        },
      ],
    });

    const foundSettings = foundReminders.map((r) => r.user.setting);

    for (const setting of foundSettings) {
      if (setting.user) {
        const reminder = foundReminders.find((r) => r.userId === setting.userId);

        firebaseMessages.push({
          token: setting.user.firebaseToken!,
          notification: { title: reminder?.title ?? ' ', body: reminder?.desc ?? ' ' },
        });
      }
    }

    if (firebaseMessages.length) {
      await this.firebaseService.sendAllMessage(firebaseMessages);

      for (const reminder of foundReminders) {
        reminder.previousNotifyDate = utcTime.format('YYYY-MM-DD');

        const periodUnit = reminder.periodUnit;
        const periodAmount = reminder.periodAmount;
        reminder.nextNotifyDate = utcTime.add(periodAmount, periodUnit).format('YYYY-MM-DD');

        await this.remindersRepo.update(reminder);
      }
    }
  }
}
