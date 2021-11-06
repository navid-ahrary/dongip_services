import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { inject } from '@loopback/core';
import { Count, CountSchema, repository } from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import ct from 'countries-and-timezones';
import jmoment from 'jalali-moment';
import moment from 'moment';
import 'moment-timezone';
import { Reminders, Users } from '../models';
import { UsersRepository } from '../repositories';
import { CurrentUserProfile } from '../services';

@authenticate('jwt.access')
export class RemindersController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly TZ = process.env.TZ!;
  private readonly notifyTime = '08:00:00';

  constructor(
    @inject(SecurityBindings.USER) protected currentUserProfile: CurrentUserProfile,
    @repository(UsersRepository) public usersRepository: UsersRepository,
  ) {
    this.userId = +this.currentUserProfile[securityId];
  }

  @post('/reminders', {
    summary: 'Create a new Reminder',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Reminders model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Reminders, { includeRelations: false }),
            example: {
              title: 'Settle up',
              desc: 'Do it today before will be late',
              repeat: true,
              enabled: true,
              price: 500000,
              periodAmount: 3,
              periodUnit: 'month',
              notifyTime: '08:00:00',
              previousNotifyDate: '2021-02-06',
              nextNotifyDate: '2021-05-06',
            },
          },
        },
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Reminders, {
            title: 'NewReminders',
            exclude: [
              'reminderId',
              'createdAt',
              'userId',
              'nextNotifyDate',
              'notifyTime',
              'deleted',
            ],
          }),
          example: {
            title: 'Settle up',
            desc: 'Do it today before will be late',
            repeat: true,
            price: 500000,
            periodAmount: 3,
            periodUnit: 'month',
            previousNotifyDate: '2021-02-06',
          },
        },
      },
    })
    reminder: Omit<Reminders, 'reminderId'>,
  ): Promise<Reminders> {
    const userRegion = this.currentUserProfile.region ?? 'IR';
    const userTZ = ct.getTimezonesForCountry(userRegion)![0].name;
    const nowUserLocaleMoment = moment.tz(userTZ);

    const firstNotifyDate = reminder.previousNotifyDate;

    const isFirstNotifyDateAfterNow = this._generateMomentfromDateAndTimeBaseTz({
      date: firstNotifyDate,
      time: this.notifyTime,
      tz: userTZ,
    }).isAfter(nowUserLocaleMoment);

    let nextNotifyDate: string;
    if (isFirstNotifyDateAfterNow) {
      nextNotifyDate = reminder.previousNotifyDate;
    } else {
      const userLang = this.currentUserProfile.language!;

      nextNotifyDate = jmoment
        .from(
          jmoment(reminder.previousNotifyDate)
            .locale(userLang)
            .add(reminder.periodAmount, reminder.periodUnit)
            .format(),
          userLang,
        )
        .format('YYYY-MM-DD');
    }

    reminder = {
      ...reminder,
      notifyTime: moment.tz(userTZ).hour(8).minute(0).second(0).tz(this.TZ).format('HH:mm:ss'),
      nextNotifyDate: nextNotifyDate,
    };

    return this.usersRepository.reminders(this.userId).create(reminder);
  }

  @get('/reminders', {
    summary: 'Get all Reminders',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Reminders model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Reminders, {
                includeRelations: false,
              }),
            },
          },
        },
      },
    },
  })
  async find(): Promise<Reminders[]> {
    return this.usersRepository.reminders(this.userId).find({ where: { deleted: false } });
  }

  @patch('/reminders/{reminderId}', {
    summary: 'Update a Reminders by reminderId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Reminders PATCH success',
      },
    },
  })
  async updateById(
    @param.path.number('reminderId') reminderId: typeof Reminders.prototype.reminderId,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Reminders, {
            partial: true,
            exclude: [
              'reminderId',
              'createdAt',
              'userId',
              'nextNotifyDate',
              'notifyTime',
              'deleted',
            ],
          }),
        },
      },
    })
    reminder: Omit<Reminders, 'reminderId'>,
  ): Promise<void> {
    const foundReminders = await this.usersRepository
      .reminders(this.userId)
      .find({ where: { reminderId: reminderId, deleted: false } });

    if (!foundReminders.length) throw new HttpErrors.UnprocessableEntity('reminder not found');

    const foundReminder = foundReminders[0];

    if (!reminder.periodAmount) reminder.periodAmount = foundReminder.periodAmount;

    if (!reminder.periodUnit) reminder.periodUnit = foundReminder.periodUnit;

    if (!reminder.previousNotifyDate) {
      reminder.previousNotifyDate = foundReminder.previousNotifyDate;
    }

    const userRegion = this.currentUserProfile.region ?? 'IR';
    const userTZ = ct.getTimezonesForCountry(userRegion)![0].name;
    const nowUserLocaleMoment = moment.tz(userTZ);

    const firstNotifyDate = reminder.previousNotifyDate;

    const isFirstNotifyDateAfterNow = this._generateMomentfromDateAndTimeBaseTz({
      date: firstNotifyDate,
      time: this.notifyTime,
      tz: userTZ,
    }).isAfter(nowUserLocaleMoment);

    let nextNotifyDate: string;
    if (isFirstNotifyDateAfterNow) {
      nextNotifyDate = reminder.previousNotifyDate;
    } else {
      const userLang = this.currentUserProfile.language!;

      nextNotifyDate = jmoment
        .from(
          jmoment(reminder.previousNotifyDate)
            .locale(userLang)
            .add(reminder.periodAmount, reminder.periodUnit)
            .format(),
          userLang,
        )
        .format('YYYY-MM-DD');
    }

    reminder.nextNotifyDate = nextNotifyDate;

    await this.usersRepository.reminders(this.userId).patch(reminder, { reminderId: reminderId });
  }

  @del('/reminders/{reminderId}', {
    summary: 'Delete a Reminders by reminderId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Reminders DELETE success',
      },
    },
  })
  async deleteById(
    @param.path.number('reminderId') reminderId: typeof Reminders.prototype.reminderId,
  ): Promise<void> {
    await this.usersRepository
      .reminders(this.userId)
      .patch({ deleted: true }, { reminderId: reminderId });
  }

  @del('/reminders', {
    summary: 'Delete all Reminders',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Reminders COUNT Deleted',
        content: {
          'application/json': {
            schema: CountSchema,
          },
        },
      },
    },
  })
  async deleteAll(): Promise<Count> {
    return this.usersRepository.reminders(this.userId).patch({ deleted: true });
  }

  private _generateMomentfromDateAndTimeBaseTz(data: {
    date: string;
    time: string;
    tz: string;
  }): moment.Moment {
    const splittedTime = data.time.split(':');

    if (splittedTime.length !== 3) throw new Error('time is not valid, "HH:mm:ss"');

    const hour = +splittedTime[0];
    const minute = +splittedTime[1];
    const second = +splittedTime[2];

    return moment(data.date).tz(data.tz).hour(hour).minute(minute).second(second);
  }
}
