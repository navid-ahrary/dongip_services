import {CronJob, cronJob} from '@loopback/cron';
import {repository} from '@loopback/repository';
import {service, BindingScope} from '@loopback/core';
import moment from 'moment';

import {SettingsRepository, UsersRepository} from '../repositories';
import {FirebaseService, BatchMessage} from '../services';
import {Settings} from '../models';

@cronJob({scope: BindingScope.SINGLETON})
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
            nowUTC.startOf('m').subtract(5, 'm').format('HH:mm:ss.00000'),
            nowUTC.startOf('m').add(4, 'm').format('HH:mm:ss.00000'),
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
      }
    }
  }

  private async generateFirebaseBatchMessage(settings: Settings[]) {
    const notifyTitle = 'وقتشه حساب کتابهاتو دُنگیپ کنی';
    const notifyBodyMessage = 'امروز بابت چیا خرج داشتی؟';
    const firebaseMessages: BatchMessage = [];

    for (const setting of settings) {
      const foundUser = await this.usersRepository.findById(setting.userId, {
        fields: {firebaseToken: true},
      });

      if (foundUser.firebaseToken && foundUser.firebaseToken !== 'null') {
        firebaseMessages.push({
          token: foundUser.firebaseToken,
          android: {
            notification: {
              title: notifyTitle,
              body: notifyBodyMessage,
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              priority: 'high',
              visibility: 'public',
              sticky: true,
              localOnly: true,
            },
          },
        });
      }
    }

    return firebaseMessages;
  }
}
