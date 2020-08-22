import {CronJob, cronJob} from '@loopback/cron';
import {repository} from '@loopback/repository';
import {service, BindingScope} from '@loopback/core';
import moment from 'moment';
import debug from 'debug';
const log = debug('loopback:cronjob');

import {SettingsRepository, UsersRepository} from '../repositories';
import {FirebaseService, BatchMessage} from '../services';
import {Settings, Users} from '../models';

@cronJob({scope: BindingScope.TRANSIENT})
export class CronJobService extends CronJob {
  readonly countRunInsts = +(process.env.instances ? process.env.instances : 1);
  readonly currentInst = +(process.env.NODE_APP_INSTANCE
    ? process.env.NODE_APP_INSTANCE
    : 0);

  constructor(
    @repository(SettingsRepository)
    public settingsRepository: SettingsRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @service(FirebaseService) public firebaseService: FirebaseService,
  ) {
    super({
      name: 'reminderNotifyJob',
      cronTime: '0 */10 * * * *',
      start: true,
      onTick: async () => {
        await this.sendReminderNotify();
      },
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
      // Split job to runnnig instances for load-balancing
      const countMaxInstanceQuota = Math.ceil(
        foundSettings.length / this.countRunInsts,
      );

      const settingsQuota: Settings[] = [];
      for (let i = 0; i < countMaxInstanceQuota; i++) {
        if (foundSettings[this.currentInst + i * this.countRunInsts]) {
          settingsQuota.push(
            foundSettings[this.currentInst + i * this.countRunInsts],
          );
        } else break;
      }

      const userIds = foundSettings.map((s) => s.userId);
      const batchMessage = await this.generateBatchMessage(userIds);
      if (batchMessage.length) {
        await this.firebaseService.sendAllMessage(batchMessage).finally(() => {
          log(
            `Cronjob started at ${nowUTC},` +
              `${batchMessage.length} notifications sent.`,
          );
        });
      }
    }
  }

  private async generateBatchMessage(userIds: typeof Users.prototype.userId[]) {
    const notifyTitle = 'وقتشه حساب کتاب‌هاتو دُنگیپ کنی';
    const notifyBodyMessage = 'امروز چه هزینه‌هایی داشتی ؟';
    const messages: BatchMessage = [];

    const foundUsers = await this.usersRepository.find({
      fields: {firebaseToken: true},
      where: {userId: {inq: userIds}},
    });

    foundUsers.forEach((user) => {
      if (user.firebaseToken && user.firebaseToken !== 'null') {
        messages.push({
          token: user.firebaseToken,
          notification: {title: notifyTitle, body: notifyBodyMessage},
          android: {
            notification: {
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              visibility: 'public',
            },
          },
          apns: {},
        });
      }
    });
    return messages;
  }
}
