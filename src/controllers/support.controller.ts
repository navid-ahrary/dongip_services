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
import { repository, Filter, Where, model, Model, property } from '@loopback/repository';
import { inject, service } from '@loopback/core';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import Ct from 'countries-and-timezones';
import _ from 'lodash';
import Moment from 'moment';
import 'moment-timezone';
import { LanguageEnum, Messages, Settings, Users } from '../models';
import { basicAuthorization, FirebaseService, MessagePayload } from '../services';
import {
  MessagesRepository,
  NotificationsRepository,
  SettingsRepository,
  UsersRepository,
} from '../repositories';
import { LocMsgsBindings } from '../keys';
import { LocalizedMessages } from '../types';

@model()
class SupportMessage extends Model {
  @property({ type: 'number', required: false })
  userId?: typeof Users.prototype.userId;

  @property({ type: 'string', required: false, jsonSchema: { enum: _.values(LanguageEnum) } })
  language?: typeof Settings.prototype.language;
}

@authorize({ allowedRoles: ['GOD'], voters: [basicAuthorization] })
@authenticate('jwt.access')
export class SupportController {
  private readonly userId: number;
  lang: string;

  constructor(
    @inject.context() public ctx: RequestContext,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(SecurityBindings.USER) public currentUserProfile: UserProfile,
    @service(FirebaseService) public firebaseService: FirebaseService,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(SettingsRepository) public settingRepo: SettingsRepository,
    @repository(MessagesRepository) public messagesRepository: MessagesRepository,
    @repository(NotificationsRepository) public notifyRepo: NotificationsRepository,
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

  @post('/support/messages/', {
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
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Messages, {
            title: 'NewMessage',
            exclude: ['messageId', 'userId', 'createdAt', 'isQuestion', 'isAnswer'],
            includeRelations: false,
          }),
          example: {
            message: 'Visit the www.dongip.ir',
          },
        },
      },
    })
    newMessage: Omit<Messages, 'messageId'>,
    @param.filter(SupportMessage, { exclude: ['fields', 'include'] })
    filter?: Filter<SupportMessage>,
  ): Promise<Array<Messages>> {
    try {
      const where = filter?.where;
      const settingWhere: Where<Settings> = {};

      const userId = _.get(where, 'userId');
      if (userId) _.assign(settingWhere, { userId: userId });

      const language = _.get(where, 'language');
      if (language) _.assign(settingWhere, { language: language });

      const foundSettings = await this.settingRepo.find({
        limit: filter?.limit,
        skip: filter?.skip,
        offset: filter?.offset,
        fields: { settingId: true, userId: true, language: true },
        where: settingWhere,
        include: [
          {
            relation: 'user',
            scope: {
              fields: { userId: true, firebaseToken: true },
              where: { firebaseToken: { nin: [undefined, null!, 'null'] } },
            },
          },
        ],
      });

      const foundTargetUsers = _.map(
        _.filter(foundSettings, (s) => s.user instanceof Users),
        (s) => s.user!,
      );
      const userIdsList = _.map(foundTargetUsers, (u) => u.userId);
      const firebaseTokensList = _.map(foundTargetUsers, (u) => u.firebaseToken!);

      const messages = _.transform(userIdsList, (result: Array<Messages>, id) => {
        result.push(new Messages({ ...newMessage, userId: id }));
        return result;
      });

      const createdMsgs = await this.messagesRepository.createAll(messages);

      const notifyMessages = [];
      for (const foundUser of foundTargetUsers) {
        const targetUserId = foundUser.userId;
        const region = foundUser.region;

        const setting = _.find(foundSettings, (s) => s.userId === targetUserId)!;
        const lang = setting.language;

        const timezone = Ct.getTimezonesForCountry(region!)[0].name;
        const timestamp = Moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

        const savedMsg = await this.messagesRepository.create({
          message: newMessage.message,
          userId: targetUserId,
          isQuestion: false,
          isAnswer: true,
        });

        const savedNotify = await this.usersRepository.notifications(targetUserId).create({
          type: 'support',
          title: this.locMsg['TICKET_RESPONSE'][lang],
          body: newMessage.message,
          messageId: savedMsg.messageId,
          createdAt: timestamp,
        });

        const notifMsg: MessagePayload = {
          notification: {
            title: savedNotify.title,
            body: savedNotify.body,
          },
          data: {
            notifyId: savedNotify.notifyId.toString(),
            title: savedNotify.title,
            body: savedNotify.body,
            type: savedNotify.type,
            createdAt: savedNotify.createdAt,
          },
        };
        notifyMessages.push(notifMsg);
      }

      if (firebaseTokensList.length) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.firebaseService.sendMultiCastMessage({ tokens: firebaseTokensList });
      }

      return createdMsgs;
    } catch (err) {
      console.error(err);
      throw new HttpErrors.NotImplemented(JSON.stringify(err));
    }
  }
}
