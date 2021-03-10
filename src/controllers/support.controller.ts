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
import { repository, Filter, Where, model, property } from '@loopback/repository';
import { inject, service } from '@loopback/core';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import Ct from 'countries-and-timezones';
import _ from 'lodash';
import Moment from 'moment';
import 'moment-timezone';
import { Messages, Settings, Users } from '../models';
import { basicAuthorization, BatchMessage, FirebaseService } from '../services';
import {
  MessagesRepository,
  NotificationsRepository,
  SettingsRepository,
  UsersRepository,
} from '../repositories';
import { LocMsgsBindings } from '../keys';
import { LocalizedMessages } from '../types';

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
            schema: { type: 'array', items: getModelSchemaRef(Messages) },
          },
        },
      },
    },
  })
  async responseToMessage(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['message'],
            properties: {
              subject: { type: 'string' },
              message: { type: 'string' },
            },
          },
          example: {
            subject: 'Happy valentine day',
            message: 'Visit the www.dongip.ir',
          },
        },
      },
    })
    newMessage: { message: string; subject?: string },
    @param.query.string('language', { required: true })
    language: typeof Settings.prototype.language,
    @param.query.number('userId', { required: false }) userId?: typeof Users.prototype.userId,
  ): Promise<Array<Messages>> {
    try {
      const settingWhere: Where<Settings> = { language: language };

      if (userId) _.assign(settingWhere, { userId: userId });

      const foundSettings = await this.settingRepo.find({
        fields: { settingId: true, userId: true, language: true },
        where: settingWhere,
        include: [
          {
            relation: 'user',
            scope: {
              fields: { userId: true, firebaseToken: true, region: true },
              where: { firebaseToken: { nin: ['null', undefined] } },
            },
          },
        ],
      });

      const foundTargetUsers = _.map(
        _.filter(foundSettings, (s) => s.user instanceof Users),
        (s) => s.user!,
      );

      console.log(
        'Valid user Id',
        _.map(foundTargetUsers, (u) => u.userId),
      );

      const firebaseTokensList = _.map(foundTargetUsers, (u) => u.firebaseToken!);

      const savedMsgs: Array<Messages> = [];

      const notifyMsgs: BatchMessage = [];
      for (const foundUser of foundTargetUsers) {
        const targetUserId = foundUser.userId;
        const region = foundUser.region;
        const firebaseToken = foundUser.firebaseToken!;
        const setting = _.find(foundSettings, (s) => s.userId === targetUserId)!;
        const lang = setting.language;

        console.log(region);
        const timezone = Ct.getTimezonesForCountry(region!).length
          ? Ct.getTimezonesForCountry(region!)[0].name
          : 'Asia/Tehran';
        const timestamp = Moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

        const savedMsg = await this.usersRepository.messages(targetUserId).create({
          message: newMessage.message,
          userId: targetUserId,
          isQuestion: false,
          isAnswer: true,
          createdAt: timestamp,
        });
        savedMsgs.push(savedMsg);

        const savedNotify = await this.usersRepository.notifications(targetUserId).create({
          type: 'supportMessage',
          title: newMessage.subject ?? this.locMsg['TICKET_RESPONSE'][lang],
          body: newMessage.message,
          messageId: savedMsg.messageId,
          createdAt: timestamp,
        });

        notifyMsgs.push({
          token: firebaseToken,
          notification: {
            title: savedNotify.title,
            body: savedNotify.body,
          },
          data: {
            notifyId: String(savedNotify.notifyId),
            title: savedNotify.title,
            body: savedNotify.body,
            type: savedNotify.type,
            createdAt: String(savedNotify.createdAt),
          },
        });
      }

      if (firebaseTokensList.length) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.firebaseService.sendAllMessage(notifyMsgs);
      }

      return savedMsgs;
    } catch (err) {
      console.error(err);
      throw new HttpErrors.NotImplemented(JSON.stringify(err));
    }
  }
}
