import { repository, DataObject } from '@loopback/repository';
import {
  post,
  get,
  getModelSchemaRef,
  requestBody,
  param,
  del,
  RequestContext,
} from '@loopback/rest';
import { intercept, inject, service } from '@loopback/core';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';

import util from 'util';
import moment from 'moment';
import 'moment-timezone';
import ct from 'countries-and-timezones';

import { JointRequest, JointResponse, JointAccountSubscribes, JointAccounts } from '../models';
import {
  JointAccountsRepository,
  JointAccountSubscribesRepository,
  UsersRelsRepository,
  UsersRepository,
} from '../repositories';
import { ValidateUsersRelsInterceptor, JointAccountsInterceptor } from '../interceptors';
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs';
import { basicAuthorization, BatchMessage, FirebaseService } from '../services';
import { LocalizedMessages } from '../application';

@authenticate('jwt.access')
export class JointAccountController {
  private readonly userId: number;
  lang: string;

  constructor(
    @repository(JointAccountsRepository) protected jointAccountsRepo: JointAccountsRepository,
    @repository(JointAccountSubscribesRepository)
    protected jointAccSubscribesRepo: JointAccountSubscribesRepository,
    @repository(UsersRelsRepository) protected usersRelsRepo: UsersRelsRepository,
    @repository(UsersRepository) protected usersRepo: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
    @inject('application.localizedMessages') protected locMsg: LocalizedMessages,
    @service(FirebaseService) protected firebaseSerice: FirebaseService,
    @inject.context() public ctx: RequestContext,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.lang = this.ctx.request.headers['accept-language'] ?? 'fa';
  }

  @authorize({ allowedRoles: ['GOLD'], voters: [basicAuthorization] })
  @post('/joint-accounts', {
    summary: 'POST a new JointAccounts',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'JointAccounts model instance',
        content: {
          'application/json': { schema: getModelSchemaRef(JointResponse) },
        },
      },
    },
  })
  @intercept(ValidateUsersRelsInterceptor.BINDING_KEY)
  async createJointAccount(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(JointRequest, {
            title: 'NewJointAccounts',
            includeRelations: false,
          }),
          example: {
            title: 'family',
            description: 'Share credit card, me and wife',
            userRelIds: [1, 11],
          },
        },
      },
    })
    jointAccountsReq: JointRequest,
  ): Promise<JointResponse> {
    const firebaseMessages: BatchMessage = [];
    const currentUser = await this.usersRepo.findById(this.userId, {
      fields: { userId: true, phone: true },
      include: [
        {
          relation: 'usersRels',
          scope: {
            where: { userRelId: { inq: jointAccountsReq.userRelIds } },
          },
        },
      ],
    });

    const JA = await this.jointAccountsRepo.create({
      userId: this.userId,
      title: jointAccountsReq.title,
      description: jointAccountsReq.description,
    });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.usersRelsRepo
      .find({
        fields: { userId: true, phone: true, type: true },
        where: {
          userId: this.userId,
          userRelId: { inq: jointAccountsReq.userRelIds },
        },
      })
      .then(async (urs) => {
        const jsList: Array<DataObject<JointAccountSubscribes>> = [];

        for (const ur of urs) {
          const user = await this.usersRepo.findOne({
            fields: { userId: true, firebaseToken: true, region: true },
            where: { phone: ur.phone },
            include: [
              { relation: 'usersRels', scope: { where: { phone: currentUser.phone } } },
              { relation: 'setting' },
            ],
          });

          jsList.push({ jointAccountId: JA.jointAccountId, userId: user!.getId() });

          if (ur.type !== 'self') {
            const timezone = ct.getTimezonesForCountry(user!.region!)[0].name;
            const time = moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

            const savedNotify = await this.usersRepo.notifications(user?.getId()).create({
              jointAccountId: JA.getId(),
              type: 'jointAccount',
              title: util.format(
                this.locMsg['NEW_JOINT_ACCOUNT_NOTIFY_TITLE'][user!.setting.language],
              ),
              body: util.format(
                this.locMsg['NEW_JOINT_ACCOUNT_NOTIFY_BODY'][user!.setting.language],
                user?.usersRels[0].name,
                JA.title,
              ),
              createdAt: time,
            });

            firebaseMessages.push({
              token: user!.firebaseToken!,
              notification: {
                title: savedNotify.title,
                body: savedNotify.body,
              },
              data: {
                notifyId: savedNotify.getId().toString(),
                title: savedNotify.title,
                body: savedNotify.body,
                jointAccountId: JA.getId().toString(),
                type: savedNotify.type,
                silent: 'false',
              },
            });
          }
        }

        await this.firebaseSerice.sendAllMessage(firebaseMessages);
        await this.jointAccSubscribesRepo.createAll(jsList);
      });

    return new JointResponse({
      jointAccountId: JA.getId(),
      createdAt: JA.createdAt,
      title: jointAccountsReq.title,
      description: jointAccountsReq.description,
      userRels: currentUser.usersRels.map((ur) => {
        return { userRelId: ur.getId(), name: ur.name, avatar: ur.avatar, type: ur.type };
      }),
      admin: true,
    });
  }

  @get('/joint-accounts', {
    summary: 'GET array of all JointAccounts',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      200: {
        description: 'Array of JointAccount',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(JointResponse) },
          },
        },
      },
    },
  })
  async getJointAccounts(): Promise<JointResponse[]> {
    const result: Array<JointResponse> = [];

    const JSAs = await this.usersRepo.jointAccountSubscribes(this.userId).find();

    const jaIds = JSAs.map((jsa) => jsa.jointAccountId);
    const JAs = await this.jointAccountsRepo.find({
      where: { jointAccountId: { inq: jaIds } },
      include: [{ relation: 'jointAccountSubscribes' }],
    });

    for (const ja of JAs) {
      const usersRels: typeof JointResponse.prototype.userRels = [];

      for (const jas of ja.jointAccountSubscribes) {
        const u = await this.usersRepo.findById(jas.userId, {
          fields: { userId: true, phone: true, name: true, avatar: true },
        });

        const userRel = await this.usersRelsRepo.findOne({
          where: { userId: this.userId, phone: u.phone },
        });

        usersRels.push({
          userRelId: userRel?.getId(),
          name: userRel?.name ?? u.name,
          avatar: userRel?.avatar ?? u.avatar,
          type: userRel?.type,
        });
      }

      result.push(
        new JointResponse({
          jointAccountId: ja.getId(),
          title: ja.title,
          description: ja.title,
          userRels: usersRels,
          createdAt: ja.createdAt,
          admin: ja.userId === this.userId ? true : false,
        }),
      );
    }

    return result;
  }

  @intercept(JointAccountsInterceptor.BINDING_KEY)
  @del('/joint-accounts/{jointAccountId}', {
    summary: 'DELETE a JointAccount by jointAccountId',
    description: 'Belongs Dongs will not be deleted',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      204: {
        description: 'JointAccount DELETE success',
      },
      422: {
        description: 'JointAccounId is not valid',
      },
    },
  })
  async deleteJointAccountById(
    @param.path.number('jointAccountId', { required: true })
    jointAccountId: typeof JointAccounts.prototype.jointAccountId,
  ): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepo.jointAccounts(this.userId).delete({ jointAccountId: jointAccountId });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepo.jointAccountSubscribes(this.userId).delete({ jointAccountId: jointAccountId });
    } catch (err) {
      console.error(err);
    }
  }

  @intercept(JointAccountsInterceptor.BINDING_KEY)
  @del('/joint-accounts/', {
    summary: 'DELETE all JointAccounts',
    description: 'Belongs Dongs will not be deleted',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'DELETE/LEFT JointAccounts ',
      },
    },
  })
  async deleteAllJointAccounts(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepo.jointAccountSubscribes(this.userId).delete();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepo.jointAccounts(this.userId).delete();
    } catch (err) {
      console.error(err);
    }
  }
}
