import {
  requestBody,
  HttpErrors,
  get,
  patch,
  param,
  getModelSchemaRef,
  RequestContext,
} from '@loopback/rest';
import { inject, intercept, service } from '@loopback/core';
import { repository, DataObject } from '@loopback/repository';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { SecurityBindings, securityId } from '@loopback/security';
import { authenticate } from '@loopback/authentication';
import _ from 'lodash';
import util from 'util';
import moment from 'moment';
import { UserPatchRequestBody } from './specs';
import { CurrentUserProfile, PhoneNumberService } from '../services';
import { UsersRepository } from '../repositories';
import {
  TokenServiceBindings,
  PackageKey,
  LocMsgsBindings,
  TutorialLinksListBinding,
  AppVersionBindings,
} from '../keys';
import { Users, CompleteSignup, Settings, UsersRels, Scores, Dongs } from '../models';
import { HeadersInterceptor, ValidatePhoneEmailInterceptor } from '../interceptors';
import { LocalizedMessages, PackageInfo, TutorialLinks } from '../types';
import { JointAccountController } from './';

@intercept(HeadersInterceptor.BINDING_KEY)
@authenticate('jwt.access')
export class UsersController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly userName: string;
  private readonly lang: string;

  constructor(
    @inject.context() public ctx: RequestContext,
    @inject(PackageKey) public packageInfo: PackageInfo,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(TutorialLinksListBinding) public tutLinks: TutorialLinks,
    @inject(SecurityBindings.USER) private currentUserProfile: CurrentUserProfile,
    @inject(TokenServiceBindings.ACCESS_EXPIRES_IN) private accessExpiresIn: string,
    @inject(AppVersionBindings.ANDROID_VERSION) private androidVersion: string,
    @inject(AppVersionBindings.IOS_VERSION) private iosVersion: string,
    @inject('controllers.JointAccountController') public jointController: JointAccountController,
    @service(PhoneNumberService) public phoneNumService: PhoneNumberService,
    @repository(UsersRepository) public usersRepository: UsersRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
    this.userName =
      currentUserProfile.name ??
      (_.includes(this.ctx.request.headers['accept-language'], 'en') ? 'mate' : 'رفیق');
  }

  @get('/users', {
    summary: 'Get User, included all related data',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      200: {
        description: 'Users model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Users),
          },
        },
      },
    },
  })
  async findUser() {
    try {
      const user = await this.usersRepository.findById(this.userId, {
        fields: {
          firebaseToken: false,
          emailLocked: false,
          phoneLocked: false,
          referralCode: false,
        },
        include: [
          { relation: 'setting', scope: { where: { deleted: false } } },
          { relation: 'budgets', scope: { where: { deleted: false } } },
          { relation: 'categories', scope: { where: { deleted: false } } },
          {
            relation: 'usersRels',
            scope: { fields: { mutualUserRelId: false }, where: { deleted: false } },
          },
          {
            relation: 'dongs',
            scope: {
              order: ['createdAt DESC'],
              fields: { originDongId: false },
              where: { deleted: false },
              include: [
                { relation: 'billList' },
                { relation: 'payerList' },
                { relation: 'category' },
                { relation: 'receipt' },
              ],
            },
          },
          { relation: 'reminders', scope: { where: { deleted: false } } },
          { relation: 'wallets', scope: { where: { deleted: false } } },
        ],
      });

      const dongs: Dongs[] = [];
      _.forEach(user.dongs, (d) => {
        const r = {
          ..._.omit(d, 'receipt'),
          receiptId: d.receipt?.receiptId,
        };

        dongs.push(r);
      });

      user.dongs = dongs;

      return _.assign(user, { jointAccounts: await this.jointController.getJointAccounts() });
    } catch (err) {
      console.error(err);
      throw new HttpErrors.NotImplemented(err.messsage);
    }
  }

  @intercept(ValidatePhoneEmailInterceptor.BINDING_KEY)
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
    @requestBody(UserPatchRequestBody) updateUserReqBody: Omit<Users, 'userId'>,
  ): Promise<void> {
    if (updateUserReqBody.avatar) {
      await this.usersRepository.usersRels(this.userId).patch(updateUserReqBody, { type: 'self' });
    }

    const patchUser: DataObject<Users> = {};

    if (updateUserReqBody.phone) {
      const phone = updateUserReqBody.phone;

      const user = await this.usersRepository.findOne({
        where: { userId: this.userId, phoneLocked: true, deleted: false },
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
        where: { userId: this.userId, emailLocked: true, deleted: false },
      });

      if (user) {
        delete updateUserReqBody.email;
      } else {
        updateUserReqBody.emailLocked = true;
        patchUser.email = updateUserReqBody.email;
      }
    }

    return this.usersRepository.updateById(this.userId, updateUserReqBody).catch((err) => {
      if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
        if (err.sqlMessage.endsWith("'users.username'")) {
          throw new HttpErrors.Conflict(this.locMsg['USERNAME_UNAVAILABLE'][this.lang]);
        }
      }
      throw new HttpErrors.NotAcceptable(err.message);
    });
  }

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
                application: {
                  type: 'object',
                  properties: {
                    accessTokenExpiresIn: { type: 'number' },
                    version: { type: 'string' },
                    maintenance: { type: 'boolean' },
                    message: { type: 'string' },
                    forceUpdate: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async userInfo(): Promise<{
    name?: string;
    roles: string[] | [];
    planId: string | null;
    solTime: string | null;
    eolTime: string | null;
    language?: string;
    currency?: string;
    registeredAt: string;
    totalScores: number;
    externalLinks: TutorialLinks;
    application: {
      accessTokenExpiresIn: number;
      version: string;
      maintenance: boolean;
      message: string;
      forceUpdate: boolean;
      updateMessage: string;
    };
  }> {
    const nowUTC = moment.utc();

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
          scope: {
            fields: { userId: true, language: true, currency: true },
            where: { deleted: false },
          },
        },
        {
          relation: 'subscriptions',
          scope: {
            limit: 1,
            fields: { userId: true, solTime: true, eolTime: true },
            where: {
              solTime: { lte: nowUTC.toISOString() },
              eolTime: { gte: nowUTC.toISOString() },
              deleted: false,
            },
          },
        },
        {
          relation: 'scores',
          scope: {
            fields: { userId: true, score: true },
            where: { deleted: false },
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

    const updateForced =
      this.currentUserProfile.platform === 'iOS'
        ? false
        : this.packageInfo.systemStatus.forceUpdate;
    const appVersion =
      this.currentUserProfile.platform === 'Android'
        ? this.androidVersion
        : this.currentUserProfile.platform === 'iOS'
        ? this.iosVersion
        : this.packageInfo.version;

    return {
      roles: roles,
      totalScores: this._calculateTotalUserScore(foundUser.scores),
      name: foundUser.name,
      planId: hasSubs ? foundUser.subscriptions[0].planId : null,
      solTime: hasSubs ? foundUser.subscriptions[0].solTime : null,
      eolTime: hasSubs ? foundUser.subscriptions[0].eolTime : null,
      language: foundUser.setting.language,
      currency: foundUser.setting.currency,
      registeredAt: foundUser.registeredAt,
      externalLinks: this.tutLinks,
      application: {
        accessTokenExpiresIn: +this.accessExpiresIn,
        version: appVersion,
        forceUpdate: updateForced,
        maintenance: this.packageInfo.systemStatus.maintenance,
        message: util.format(this.locMsg['SERVER_MAINTENACE'][this.lang], this.userName),
        updateMessage: util.format(this.locMsg['UPDATE_MESSAGE'][this.lang], appVersion),
      },
    };
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
        'application/json': {
          schema: getModelSchemaRef(CompleteSignup),
          example: {
            name: 'Dongip',
            avatar: '/assets/avatar/avatar_1.png',
            language: 'fa',
            currency: 'IRR',
            phone: '+989171234567',
            email: 'dongip.app@dongip.ir',
            referralCode: 'DGP-123456',
          },
        },
      },
    })
    cmpltSignBody: CompleteSignup,
  ): Promise<void> {
    try {
      const foundUser = await this.usersRepository.findById(this.userId, {
        fields: { phoneLocked: true, emailLocked: true },
      });

      if (foundUser.phoneLocked && foundUser.emailLocked) throw new Error('DONE');

      const userProps = new Users(_.pick(cmpltSignBody, ['avatar', 'name', 'referralCode']));
      const settingProps = new Settings(_.pick(cmpltSignBody, ['language', 'currency']));
      const userRelProps = new UsersRels(_.pick(cmpltSignBody, ['avatar', 'name']));

      if (!foundUser.phoneLocked && cmpltSignBody.phone) {
        const postedPhone = cmpltSignBody.phone;

        userProps.phoneLocked = true;
        userProps.phone = postedPhone;
        userProps.region = this.phoneNumService.getRegionCodeISO(postedPhone);
        userRelProps.phone = postedPhone;
      }

      if (!foundUser.emailLocked && cmpltSignBody.email) {
        const postedEmail = cmpltSignBody.email;

        userProps.emailLocked = true;
        userProps.email = postedEmail;
        userRelProps.email = postedEmail;
      }

      // console.log('completion userProps', JSON.stringify(userProps));
      await this.usersRepository.updateById(this.userId, userProps);

      // console.log('completion userRelProps', JSON.stringify(userRelProps));
      await this.usersRepository.usersRels(this.userId).patch(userRelProps, { type: 'self' });

      if (_.keys(settingProps).length) {
        // console.log('completion settingProps', JSON.stringify(settingProps));
        await this.usersRepository.setting(this.userId).patch(settingProps);
      }
    } catch (err) {
      let errMsg = '';

      if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
        if (err.sqlMessage.endsWith("'phone'")) {
          errMsg = this.locMsg['COMPLETE_SIGNUP_CONFILICT_PHONE'][this.lang];
        } else if (err.sqlMessage.endsWith("'email'")) {
          errMsg = this.locMsg['COMPLETE_SIGNUP_CONFILICT_EMAIL'][this.lang];
        }

        throw new HttpErrors.Conflict(errMsg);
      } else if (err.errno === 1406 && err.code === 'ER_DATA_TOO_LONG') {
        throw new HttpErrors.NotAcceptable(err.message);
      } else {
        throw new HttpErrors.NotAcceptable(err.message);
      }
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

  private _calculateTotalUserScore(scores: Array<Scores>): number {
    let result = 0;
    scores.forEach((s) => (result += s.score));
    return result;
  }
}
