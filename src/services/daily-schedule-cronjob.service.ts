import { BindingScope, inject, service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import _ from 'lodash';
import moment from 'moment';
import { LocMsgsBindings } from '../keys';
import { RemindersRepository, SettingsRepository, UsersRepository } from '../repositories';
import { LocalizedMessages } from '../types';
import { BatchMessage, FirebaseService } from './firebase.service';

const TZ: string = process.env.TZ ?? 'utc';

@cronJob({ scope: BindingScope.TRANSIENT })
export class DailyScheduleConjobService extends CronJob {
  constructor(
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @service(FirebaseService) public firebaseService: FirebaseService,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(RemindersRepository) public remindersRepo: RemindersRepository,
    @repository(SettingsRepository) public settingsRepository: SettingsRepository,
  ) {
    super({
      name: 'dailyScheduleNotifyJob',
      cronTime: '10 */10 * * * *',
      start: true,
      timeZone: TZ,
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onTick: async () => {
        if (_.isUndefined(process.env.NODE_APP_INSTANCE) || process.env.NODE_APP_INSTANCE === '0') {
          await this.sendDailyNotify();
        }
      },
    });
  }

  private async sendDailyNotify() {
    const utcTime = moment().isDST() ? moment.utc() : moment.utc().subtract(1, 'hour');
    const firebaseMessages: BatchMessage = [];

    const foundSettings = await this.settingsRepository.find({
      fields: { userId: true, language: true },
      where: {
        scheduleNotify: true,
        deleted: false,
        scheduleTime: {
          between: [
            moment(utcTime).startOf('minute').subtract(4, 'minutes').format('HH:mm:ss.00000'),
            moment(utcTime).startOf('minute').add(5, 'minutes').format('HH:mm:ss.00000'),
          ],
        },
      },
      include: [
        {
          relation: 'user',
          scope: {
            fields: { userId: true, firebaseToken: true },
            where: {
              firebaseToken: { nin: [undefined, 'null'] },
              deleted: false,
            },
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
          token: setting.user.firebaseToken ?? ' ',
          notification: { title: notifyTitle, body: notifyBody },
        });
      }
    }

    if (firebaseMessages.length) await this.firebaseService.sendAllMessage(firebaseMessages);
  }
}
