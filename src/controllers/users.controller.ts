import { inject, intercept, service } from '@loopback/core';
import { repository, DataObject } from '@loopback/repository';
import {
  requestBody,
  HttpErrors,
  get,
  patch,
  api,
  param,
  getModelSchemaRef,
  RequestContext,
} from '@loopback/rest';
import { authenticate, UserService, TokenService } from '@loopback/authentication';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';

import _ from 'lodash';
import moment from 'moment';

import { UserServiceBindings, TokenServiceBindings } from '../keys';
import { UserPatchRequestBody } from './specs';
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs';
import { Users, Credentials, CompleteSignup, Settings, UsersRels } from '../models';
import { UsersRepository, LinksRepository } from '../repositories';
import { FirebasetokenInterceptor, ValidatePhoneEmailInterceptor } from '../interceptors';
import { PhoneNumberService } from '../services';
import { LocalizedMessages } from '../application';

@api({ basePath: '/', paths: {} })
@authenticate('jwt.access')
export class UsersController {
  private readonly userId: number;
  lang: string;

  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(LinksRepository) public linkRepository: LinksRepository,
    @inject(UserServiceBindings.USER_SERVICE) public userService: UserService<Users, Credentials>,
    @inject(TokenServiceBindings.TOKEN_SERVICE) public jwtService: TokenService,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @service(PhoneNumberService) public phoneNumService: PhoneNumberService,
    @inject.context() public ctx: RequestContext,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.lang = this.ctx.request.headers['accept-language'] ?? 'fa';
  }

  async getUserScores(userId: typeof Users.prototype.userId): Promise<number> {
    const scoresList = await this.usersRepository.scores(userId).find();
    let totalScores = 0;
    scoresList.forEach((scoreItem) => {
      totalScores += scoreItem.score;
    });
    return totalScores;
  }

  @intercept(FirebasetokenInterceptor.BINDING_KEY)
  @get('/users/info', {
    summary: "Get User's info",
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "User's props",
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                roles: {
                  type: 'array',
                  items: {
                    oneOf: [{ type: 'string', minItems: 1, maxItems: 5 }, { type: undefined }],
                  },
                },
                planId: {
                  type: 'string',
                  nullable: true,
                },
                solTime: {
                  type: 'string',
                  nullable: true,
                },
                eolTime: {
                  type: 'string',
                  nullable: true,
                },
                registeredAt: { type: 'string' },
                totalScores: { type: 'number' },
                externalLinks: {
                  type: 'object',
                  properties: {
                    userRel: { type: 'string' },
                    group: { type: 'string' },
                    budget: { type: 'string' },
                    addDong: { type: 'string' },
                    category: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async findUserRrops(): Promise<{
    name: string;
    roles: string[] | [];
    planId: string | null;
    solTime: string | null;
    eolTime: string | null;
    language: string;
    currency: string;
    registeredAt: string;
    totalScores: number;
    externalLinks: object;
  }> {
    const nowUTC = moment.utc();
    const scores = await this.getUserScores(this.userId);

    const foundUser = await this.usersRepository.findById(this.userId, {
      fields: {
        userId: true,
        name: true,
        roles: true,
        registeredAt: true,
        userAgent: true,
        setting: true,
      },
      include: [
        {
          relation: 'setting',
          scope: { fields: { userId: true, language: true, currency: true } },
        },
        {
          relation: 'subscriptions',
          scope: {
            limit: 1,
            fields: { userId: true, solTime: true, eolTime: true },
            where: {
              solTime: { lte: nowUTC.toISOString() },
              eolTime: { gte: nowUTC.toISOString() },
            },
          },
        },
      ],
    });

    const hasSubs = foundUser.subscriptions ? foundUser.subscriptions.length > 0 : false;

    const roles = foundUser.roles;

    if (hasSubs && !roles.includes('GOLD')) {
      roles[roles.indexOf('BRONZE')] = 'GOLD';
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository.updateById(this.userId, { roles: roles });
    }

    if (!hasSubs && roles.includes('GOLD')) {
      roles[roles.indexOf('GOLD')] = 'BRONZE';
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository.updateById(this.userId, { roles: roles });
    }

    const foundLinks = await this.linkRepository.find();

    const externalLinks: { [key: string]: string } = {};
    foundLinks.forEach((link) => {
      externalLinks[link.name] = link.url;
    });

    return {
      name: foundUser!.name,
      roles: roles,
      planId: hasSubs ? foundUser.subscriptions[0].planId : null,
      solTime: hasSubs ? foundUser.subscriptions[0].solTime : null,
      eolTime: hasSubs ? foundUser.subscriptions[0].eolTime : null,
      language: foundUser.setting.language,
      currency: foundUser.setting.currency,
      registeredAt: foundUser.registeredAt,
      totalScores: scores,
      externalLinks: externalLinks,
    };
  }

  @intercept(FirebasetokenInterceptor.BINDING_KEY, ValidatePhoneEmailInterceptor.BINDING_KEY)
  @patch('/users', {
    summary: "Update User's properties",
    description: 'Request body includes desired properties to update',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'User PATCH success - No content',
      },
    },
  })
  async updateUserById(
    @requestBody(UserPatchRequestBody) updateUserReqBody: Omit<Users, '_key'>,
  ): Promise<void> {
    if (updateUserReqBody.avatar) {
      await this.usersRepository.usersRels(this.userId).patch(updateUserReqBody, { type: 'self' });
    }

    const patchUser: DataObject<Users> = {};

    if (updateUserReqBody.phone) {
      const phone = updateUserReqBody.phone;

      const user = await this.usersRepository.findOne({
        where: { userId: this.userId, phoneLocked: true },
      });

      if (user) {
        delete updateUserReqBody.phone;
      } else {
        updateUserReqBody.region = this.phoneNumService.getRegionCodeISO(phone);
        updateUserReqBody.phoneLocked = true;

        patchUser.phone = phone;
      }
    }

    if (updateUserReqBody.email) {
      const user = await this.usersRepository.findOne({
        where: { userId: this.userId, emailLocked: true },
      });

      if (user) {
        delete updateUserReqBody.email;
      } else {
        updateUserReqBody.emailLocked = true;
        patchUser.email = updateUserReqBody.email;
      }
    }

    // // eslint-disable-next-line @typescript-eslint/no-floating-promises
    // this.usersRepository.usersRels(this.userId).patch(patchUser, { type: 'self' });

    return this.usersRepository.updateById(this.userId, updateUserReqBody).catch((err) => {
      if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
        if (err.sqlMessage.endsWith("'users.username'")) {
          throw new HttpErrors.Conflict(this.locMsg['USERNAME_UNAVAILABLE'][this.lang]);
        }
      }
      throw new HttpErrors.NotAcceptable(err.message);
    });
  }

  @intercept(ValidatePhoneEmailInterceptor.BINDING_KEY)
  @patch('/users/complete-signup', {
    summary: "Post essential user's properties for complete user signup",
    security: OPERATION_SECURITY_SPEC,
    responses: {
      204: { description: 'no content' },
      409: { description: 'Conflict phone or email' },
    },
  })
  async completeSignup(
    @requestBody({
      content: {
        'application/json': { schema: getModelSchemaRef(CompleteSignup) },
      },
    })
    cmpltSignBody: CompleteSignup,
  ): Promise<void> {
    try {
      const userProps: Partial<Users> = _.pick(cmpltSignBody, ['avatar', 'name', 'phone', 'email']);
      const settingProps: Partial<Settings> = _.pick(cmpltSignBody, ['language', 'currency']);
      const userRelProps: Partial<UsersRels> = _.pick(cmpltSignBody, ['avatar', 'name']);

      if (_.has(userProps, 'phone')) {
        const u = await this.usersRepository.findOne({
          where: { userId: this.userId, phoneLocked: true },
        });

        if (u) delete userProps.phone;
        else {
          Object.assign(userProps, { phoneLocked: true });
          userRelProps.phone = userProps.phone;
          userProps.region = this.phoneNumService.getRegionCodeISO(userProps.phone!);
        }
      }

      if (_.has(userProps, 'email')) {
        const u = await this.usersRepository.findOne({
          where: { userId: this.userId, emailLocked: true },
        });

        if (u) delete userProps.email;
        else {
          Object.assign(userProps, { emailLocked: true });
          userRelProps.email = userProps.email;
        }
      }
      await this.usersRepository.usersRels(this.userId).patch(userRelProps, { type: 'self' });

      if (Object.keys(settingProps).length) {
        await this.usersRepository.setting(this.userId).patch(settingProps);
      }

      if (Object.keys(userProps).length) {
        await this.usersRepository.updateById(this.userId, userProps);
      }
    } catch (err) {
      let errMsg = '';

      if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
        if (err.sqlMessage.endsWith("'phone'")) {
          errMsg = this.locMsg['COMPLETE_SIGNUP_CONFILICT_PHONE'][this.lang];
        }
        if (err.sqlMessage.endsWith("'email'")) {
          errMsg = this.locMsg['COMPLETE_SIGNUP_CONFILICT_EMAIL'][this.lang];
        }
      } else if (err.errno === 1406 && err.code === 'ER_DATA_TOO_LONG') {
        throw new HttpErrors.NotAcceptable(err.message);
      } else {
        throw new HttpErrors.NotAcceptable(err.message);
      }
      throw new HttpErrors.Conflict(errMsg);
    }
  }

  @get('/users/available', {
    summary: 'Check username availablity',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': { description: 'Username is available [No content]' },
      '409': { description: 'Username is taken' },
    },
  })
  async findUsername(
    @param.query.string('username', { required: true }) username: string,
  ): Promise<void> {
    const foundUsername = await this.usersRepository.count({
      userId: { neq: this.userId },
      username: username,
    });

    if (foundUsername.count)
      throw new HttpErrors.Conflict(this.locMsg['USERNAME_UNAVAILABLE'][this.lang]);
  }
}
