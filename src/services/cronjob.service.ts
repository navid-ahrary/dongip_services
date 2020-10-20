import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import { service, BindingScope, inject } from '@loopback/core';
import moment from 'moment';
import debug from 'debug';
const log = debug('api:cronjob');

import { SettingsRepository, UsersRepository } from '../repositories';
import { FirebaseService, BatchMessage } from '../services';
import { LocalizedMessages } from '../application';

@cronJob({ scope: BindingScope.TRANSIENT })
export class CronJobService extends CronJob {
  constructor(
    @repository(SettingsRepository)
    public settingsRepository: SettingsRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @service(FirebaseService) public firebaseService: FirebaseService,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
  ) {
    super({
      name: 'reminderNotifyJob',
      onTick: async () => {
        // Run cronjob only on one instance in pm2
        if (process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === '0') {
          await this.sendReminderNotify();
        }
      },
      cronTime: '0 */10 * * * *',
      start: true,
    });
  }

  private async sendReminderNotify() {
    const nowUTC = moment().isDST() ? moment.utc() : moment.utc().add(1, 'h');

    const foundSettings = await this.settingsRepository.find({
      fields: { userId: true, language: true },
      where: {
        scheduleNotify: true,
        scheduleTime: {
          between: [
            nowUTC.startOf('m').subtract(4, 'm').format('HH:mm:ss.00000'),
            nowUTC.startOf('m').add(5, 'm').format('HH:mm:ss.00000'),
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

    const firebaseMessages: BatchMessage = [];

    for (const setting of foundSettings) {
      if (setting.user) {
        const lang = setting.language;
        const notifyTitle = this.locMsg['DAILY_NOTIFY_TITLE'][lang];
        const notifyBody = this.locMsg['DAILY_NOTIFY_BODY'][lang];

        firebaseMessages.push({
          token: setting.user.firebaseToken!,
          notification: { title: notifyTitle, body: notifyBody },
          android: {
            notification: {
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              visibility: 'public',
            },
          },
        });
      }
    }

    if (firebaseMessages.length) {
      await this.firebaseService.sendAllMessage(firebaseMessages);

      log(`Cronjob started at ${nowUTC}, ${firebaseMessages.length} notifications sent`);
    }
  }
}
