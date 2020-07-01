import {
  get,
  getModelSchemaRef,
  api,
  param,
  post,
  requestBody,
} from '@loopback/rest';
import {authorize} from '@loopback/authorization';
import {authenticate} from '@loopback/authentication';
import {repository, Filter} from '@loopback/repository';
import {inject, service} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';

import {Messages, Users} from '../models';
import {basicAuthorization, FirebaseService, MessagePayload} from '../services';
import {MessagesRepository, UsersRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

@api({basePath: '/api/support/', paths: {}})
@authorize({allowedRoles: ['GOD'], voters: [basicAuthorization]})
@authenticate('jwt.access')
export class SupportController {
  userId: number;

  constructor(
    @repository(MessagesRepository)
    public messagesRepository: MessagesRepository,
    @repository(UsersRepository)
    public usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) protected curretnUserProfile: UserProfile,
    @service(FirebaseService) protected firebaseService: FirebaseService,
  ) {
    this.userId = Number(this.curretnUserProfile[securityId]);
  }

  @get('/messages', {
    summary: ' GET Messages asked recently',
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
  async findMessages(
    @param.query.object('filterOnMessage', {
      example: {
        offset: 0,
        limit: 100,
        skip: 0,
        where: {},
        order: ['createdAt ASC'],
        fields: {
          messageId: true,
          message: true,
          isQuestion: true,
          isAnswer: true,
          createdAt: true,
          userId: true,
        },
      },
    })
    filterOnMessage?: Filter<Messages>,
  ): Promise<Messages[]> {
    return this.messagesRepository.find(filterOnMessage);
  }

  @post('/messages/{targetUserId}', {
    summary: 'POST a answer message to user',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        content: {
          'application/json': {
            schema: getModelSchemaRef(Messages),
          },
        },
      },
    },
  })
  async responseToMessage(
    @param.path.number('targetUserId', {required: true})
    targetUserId: typeof Users.prototype.userId,
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
    const messageEntity = {
      message: newMessage.message,
      createdAt: new Date().toISOString(),
      userId: targetUserId,
      isQuestion: false,
      isAnswer: true,
    };
    const createdMessage = await this.messagesRepository.create(messageEntity);

    const foundTargetUser = await this.usersRepository.findById(targetUserId, {
      fields: {firebaseToken: true},
    });
    const notifyMessage: MessagePayload = {
      notification: {
        title: 'پاسخ به تیکت',
        body: newMessage.message.toString(),
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.firebaseService.sendToDeviceMessage(
      foundTargetUser.firebaseToken,
      notifyMessage,
    );

    return createdMessage;
  }
}
