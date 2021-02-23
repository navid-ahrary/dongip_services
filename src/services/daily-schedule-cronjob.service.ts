import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import { service, BindingScope, inject } from '@loopback/core';
import Moment from 'moment';
import _ from 'lodash';
import { RemindersRepository, SettingsRepository, UsersRepository } from '../repositories';
import { FirebaseService, BatchMessage } from '.';
import { LocalizedMessages } from '../types';
import { LocMsgsBindings } from '../keys';

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
      cronTime: '0 */10 * * * *',
      start: true,
      timeZone: process.env.TZ!,
      onTick: async () => {
        if (
          _.isUndefined(process.env.NODE_APP_INSTANCE) ||
          (process.env.NODE_APP_INSTANCE === '0' && process.env.HOSTNAME === 'dongip_1')
        ) {
          await this._sendDailyNotify();
        }
      },
    });
  }

  private async _sendDailyNotify() {
    const utcTime = Moment().isDST() ? Moment.utc() : Moment.utc().subtract(1, 'hour');
    const firebaseMessages: BatchMessage = [];

    const foundSettings = await this.settingsRepository.find({
      fields: { userId: true, language: true },
      where: {
        scheduleNotify: true,
        scheduleTime: {
          between: [
            Moment(utcTime).startOf('minute').subtract(4, 'minutes').format('HH:mm:ss.00000'),
            Moment(utcTime).startOf('minute').add(5, 'minutes').format('HH:mm:ss.00000'),
          ],
        },
      },
      include: [
        {
          relation: 'user',
          scope: {
            fields: { userId: true, firebaseToken: true },
            where: { firebaseToken: { nin: [null, 'null'] } },
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
}
