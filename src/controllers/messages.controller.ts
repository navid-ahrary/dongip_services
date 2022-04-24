/* eslint-disable @typescript-eslint/naming-convention */
import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { inject, intercept, service } from '@loopback/core';
import { repository } from '@loopback/repository';
import { get, getModelSchemaRef, post, requestBody } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import moment from 'moment-timezone';
import { HeadersInterceptor } from '../interceptors';
import { Messages, Users } from '../models';
import { UsersRepository } from '../repositories';
import { CurrentUserProfile, FirebaseSupportService } from '../services';

@authenticate('jwt.access')
@intercept(HeadersInterceptor.BINDING_KEY)
export class MessagesController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly name: string;
  private readonly timezone: string;

  constructor(
    @service(FirebaseSupportService) private firebaseSupportService: FirebaseSupportService,
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
    @repository(UsersRepository) private usersRepository: UsersRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
    this.name = currentUserProfile.name!;
    this.timezone = currentUserProfile.timezone!;
  }

  @post('/messages', {
    summary: 'POST a Message',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Message model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Messages),
          },
        },
      },
    },
  })
  async createMessages(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Messages, {
            title: 'NewMessage',
            exclude: [
              'messageId',
              'userId',
              'createdAt',
              'isQuestion',
              'isAnswer',
              'deleted',
              'closed',
            ],
            includeRelations: false,
          }),
          example: {
            message: 'How can I be a GOLD User?',
          },
        },
      },
    })
    newMessage: Omit<Messages, 'messageId'>,
  ): Promise<Messages> {
    const messageContent = newMessage.message;

    const messageEntity = new Messages({
      message: messageContent,
      isQuestion: true,
      isAnswer: false,
      createdAt: moment().tz(this.timezone).format('YYYY-MM-DDTHH:mm:ss+00:00'),
    });

    const createdMsg = await this.usersRepository.messages(this.userId).create(messageEntity);

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.usersRepository
      .find({
        fields: { firebaseToken: true },
        where: {
          deleted: false,
          and: [
            {
              or: [
                { roles: { regexp: new RegExp('.*' + 'GOD' + '.*') } },
                { roles: { regexp: new RegExp('.*' + 'SUPPORT' + '.*') } },
              ],
            },
            {
              and: [
                { firebaseToken: { neq: 'null' } },
                { firebaseToken: { neq: null! } },
                { firebaseToken: { neq: '' } },
              ],
            },
          ],
        },
      })
      .then(users => {
        if (users.length) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.firebaseSupportService.sendMultiCastMessage({
            tokens: users.map(u => u.firebaseToken!),
            notification: {
              title: `id ${this.userId}:${this.name}`,
              body: messageContent,
            },
          });
        }
      });

    return createdMsg;
  }

  @get('/messages', {
    summary: 'GET all Messages',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Messages model instances',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(Messages) },
          },
        },
      },
    },
  })
  async findMessages(): Promise<Messages[]> {
    return this.usersRepository.messages(this.userId).find({
      order: ['createdAt ASC'],
      where: { deleted: false },
    });
  }
}
