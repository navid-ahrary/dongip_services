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
      name: 'scheduleTimeNotify-Job',
      onTick: async () => {
        await this.performMyJob();
      },
      cronTime: '* 0,30 * * * *',
      start: true,
      timeZone: 'Asia/Tehran',
    });
  }

  async performMyJob() {
    const foundSettings = await this.settingsRepository.find({
      fields: {userId: true, scheduleTime: true},
      where: {
        scheduleNotify: true,
        scheduleTime: {
          between: [
            moment().subtract(14, 'm').startOf('m').format('HH:mm:ss.00000'),
            moment().add(15, 'm').startOf('m').format('HH:mm:ss.00000'),
          ],
        },
      },
    });

    const firebaseMessages = await this.generateFirebaseBatchMessage(
      foundSettings,
    );

    if (firebaseMessages.length) {
      await this.firebaseService.sendAllMessage(firebaseMessages);
    }
  }

  private async generateFirebaseBatchMessage(settings: Settings[]) {
    const notifyTitle = 'وقتشه حساب کتابهاتو دُنگیپ کنی';
    const firebaseMessages: BatchMessage = [];

    for (const setting of settings) {
      const foundUser = await this.usersRepository.findById(setting.userId, {
        fields: {firebaseToken: true},
      });

      if (foundUser.firebaseToken) {
        firebaseMessages.push({
          token: foundUser.firebaseToken,
          android: {
            notification: {
              title: notifyTitle,
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
