import {CronJob, cronJob} from '@loopback/cron';
import {repository} from '@loopback/repository';
import {service, BindingScope} from '@loopback/core';
import moment from 'moment';
import debug from 'debug';
const log = debug('api:cronjob');

import {SettingsRepository, UsersRepository} from '../repositories';
import {FirebaseService, BatchMessage} from '../services';
import {Settings} from '../models';

@cronJob({scope: BindingScope.TRANSIENT})
export class CronJobService extends CronJob {
  constructor(
    @repository(SettingsRepository)
    public settingsRepository: SettingsRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @service(FirebaseService) public firebaseService: FirebaseService,
  ) {
    super({
      name: 'reminderNotifyJob',
      onTick: async () => {
        // Run cronjob only on one instance in pm2
        if (
          process.env.NODE_APP_INSTANCE === undefined ||
          process.env.NODE_APP_INSTANCE === '0'
        ) {
          await this.sendReminderNotify();
        }
      },
      cronTime: '0 */10 * * * *',
      start: true,
    });
  }

  private async sendReminderNotify() {
    const nowUTC = moment.utc();

    const foundSettings = await this.settingsRepository.find({
      fields: {userId: true},
      where: {
        scheduleNotify: true,
        scheduleTime: {
          between: [
            nowUTC.startOf('m').subtract(4, 'm').format('HH:mm:ss.00000'),
            nowUTC.startOf('m').add(5, 'm').format('HH:mm:ss.00000'),
          ],
        },
      },
    });

    if (foundSettings.length) {
      const firebaseMessages = await this.generateFirebaseBatchMessage(
        foundSettings,
      );

      if (firebaseMessages.length) {
        await this.firebaseService.sendAllMessage(firebaseMessages);

        log(
          `Cronjob started at ${nowUTC}, ${firebaseMessages.length} notifications sent`,
        );
      }
    }
  }

  private async generateFirebaseBatchMessage(settings: Settings[]) {
    const notifyTitle = 'وقتشه حساب کتاب‌هاتو دُنگیپ کنی';
    const notifyBodyMessage = 'امروز چه هزینه‌هایی داشتی ؟';
    const firebaseMessages: BatchMessage = [];

    const userIdsList = settings.map((u) => u.userId);
    const foundUsers = await this.usersRepository.find({
      fields: {firebaseToken: true},
      where: {userId: {inq: userIdsList}, firebaseToken: {neq: undefined}},
    });

    for (const user of foundUsers) {
      firebaseMessages.push({
        token: user.firebaseToken,
        notification: {title: notifyTitle, body: notifyBodyMessage},
        android: {
          notification: {
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            visibility: 'public',
          },
        },
      });
    }
    return firebaseMessages;
  }
}
