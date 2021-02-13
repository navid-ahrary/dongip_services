import {
  get,
  getModelSchemaRef,
  param,
  post,
  requestBody,
  RequestContext,
  HttpErrors,
} from '@loopback/rest';
import { authorize } from '@loopback/authorization';
import { authenticate } from '@loopback/authentication';
import { repository, Filter } from '@loopback/repository';
import { inject, service } from '@loopback/core';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import ct from 'countries-and-timezones';
import _ from 'lodash';
import moment from 'moment';
import 'moment-timezone';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { Messages, Notifications, Users } from '../models';
import { basicAuthorization, FirebaseService, MessagePayload } from '../services';
import { MessagesRepository, UsersRepository } from '../repositories';
import { LocalizedMessages } from '../application';

@authorize({ allowedRoles: ['GOD'], voters: [basicAuthorization] })
@authenticate('jwt.access')
export class SupportController {
  private readonly userId: number;
  lang: string;

  constructor(
    @repository(MessagesRepository)
    public messagesRepository: MessagesRepository,
    @repository(UsersRepository)
    public usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
    @service(FirebaseService) protected firebaseService: FirebaseService,
    @inject.context() public ctx: RequestContext,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  @get('/support/messages', {
    summary: ' GET Messages asked recently',
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
  async findMessages(
    @param.query.object('filterOnMessage', {
      example: {
        limit: 5,
        where: { userId: 1 },
        order: ['createdAt DESC'],
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

  @post('/support/messages/{userId}', {
    summary: 'POST a answer message to user',
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
  async responseToMessage(
    @param.path.number('userId', { required: true }) userId: typeof Users.prototype.userId,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Messages, {
            title: 'NewMessage',
            exclude: ['messageId', 'userId', 'createdAt', 'isQuestion', 'isAnswer'],
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
    try {
      const foundTargetUser = await this.usersRepository.findById(userId, {
        fields: { userId: true, firebaseToken: true, region: true },
        include: [{ relation: 'setting', scope: { fields: { userId: true, language: true } } }],
      });

      const token = foundTargetUser.firebaseToken ?? '';
      const lang = foundTargetUser.setting.language;
      const region = foundTargetUser.region;
      const timezone = ct.getTimezonesForCountry(region!)[0].name;
      const time = moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

      const createdMessage = await this.messagesRepository.create({
        message: newMessage.message,
        userId: userId,
        isQuestion: false,
        isAnswer: true,
      });

      const notifyData = new Notifications({
        title: this.locMsg['TICKET_RESPONSE'][lang],
        body: newMessage.message,
        type: 'supportMessage',
        createdAt: time,
      });
      const createdNotify = await this.usersRepository.notifications(userId).create(notifyData);

      const notifyMessage: MessagePayload = {
        notification: {
          title: createdNotify.title,
          body: createdNotify.body,
        },
        data: {
          notifyId: createdNotify.getId().toString(),
          title: notifyData.title,
          body: notifyData.body,
          type: notifyData.type,
          createdAt: notifyData.createdAt,
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.firebaseService.sendToDeviceMessage(token, notifyMessage);
      return createdMessage;
    } catch (err) {
      console.error(err);
      throw new HttpErrors.NotImplemented(JSON.stringify(err));
    }
  }

  @get('/support/message/{userId}', {
    summary: 'GET all Messages belong to userId',
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
  async findUserBelongMessage(
    @param.path.number('userId', { required: true }) userId: number,
  ): Promise<Array<Messages>> {
    return this.usersRepository.messages(userId).find({ order: ['crearedAt DESC'] });
  }
}
