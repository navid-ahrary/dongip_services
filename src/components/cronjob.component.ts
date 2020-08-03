import {CronJob, cronJob} from '@loopback/cron';
import {repository} from '@loopback/repository';
import moment from 'moment';

import {SettingsRepository, UsersRepository} from '../repositories';

@cronJob()
export class CronJobComponent extends CronJob {
  constructor(
    @repository(UsersRepository) private usersRepository: UsersRepository,
    @repository(SettingsRepository)
    private settingsRepository: SettingsRepository,
  ) {
    super({
      name: 'job-1',
      cronTime: '*/5 * * * * *',
      onTick: async () => {
        await this.scheduleNotifyJob();
      },
      start: false,
    });
  }

  async scheduleNotifyJob() {
    const foundUserIds = await this.settingsRepository.find({
      fields: {userId: true},
      where: {
        scheduleNotify: true,
        scheduleTime: {
          between: [new Date().toTimeString(), new Date().toTimeString()],
        },
      },
    });

    console.log(foundUserIds);
  }
}
