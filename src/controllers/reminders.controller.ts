import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { Count, CountSchema, repository } from '@loopback/repository';
import { post, param, get, getModelSchemaRef, patch, del, requestBody } from '@loopback/rest';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { Reminders } from '../models';
import { RemindersRepository, UsersRepository } from '../repositories';

@authenticate('jwt.access')
export class RemindersController {
  private readonly userId: number;

  constructor(
    @repository(RemindersRepository) public remindersRepository: RemindersRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
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
            schema: getModelSchemaRef(Reminders, { exclude: ['userId', 'createdAt'] }),
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
            exclude: ['reminderId', 'createdAt', 'userId', 'nextNotifyDate', 'previousNotifyDate'],
          }),
          example: {
            title: 'string',
            desc: 'string',
            periodAmount: 1,
            periodUnit: 'month',
            notifyTime: '22:00:00',
            previousNotifyDate: '2021-02-06',
            nextNotifyDate: '2021-03-06',
            repeat: true,
            price: 1000000,
          },
        },
      },
    })
    reminders: Omit<Reminders, 'reminderId'>,
  ): Promise<Reminders> {
    return this.usersRepository.reminders(this.userId).create(reminders);
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
                exclude: ['nextNotifyDate'],
              }),
            },
          },
        },
      },
    },
  })
  async find(): Promise<Reminders[]> {
    return this.usersRepository
      .reminders(this.userId)
      .find({ fields: { nextNotifyDate: false, previousNotifyDate: false } });
  }

  @patch('/reminders/{reminderId}', {
    summary: 'Update a Remindes by reminderId',
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
            exclude: ['createdAt', 'userId', 'nextNotifyDate', 'previousNotifyDate'],
          }),
        },
      },
    })
    reminders: Reminders,
  ): Promise<void> {
    await this.usersRepository.reminders(this.userId).patch(reminders, {
      userId: this.userId,
      reminderId: reminderId,
    });
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
    await this.usersRepository.reminders(this.userId).delete({ reminderId: reminderId });
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
    return this.usersRepository.reminders(this.userId).delete();
  }
}
