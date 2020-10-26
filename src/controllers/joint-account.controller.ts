import { repository, DataObject } from '@loopback/repository';
import {
  post,
  get,
  getModelSchemaRef,
  requestBody,
  param,
  del,
  HttpErrors,
  RequestContext,
} from '@loopback/rest';
import { intercept, inject, service } from '@loopback/core';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';

import util from 'util';

import { JointRequest, JointResponse, JointAccountSubscribes, JointAccounts } from '../models';
import {
  JointAccountsRepository,
  JointAccountSubscribesRepository,
  UsersRelsRepository,
  UsersRepository,
} from '../repositories';
import { ValidateUsersRelsInterceptor } from '../interceptors';
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs';
import { basicAuthorization, BatchMessage, FirebaseService } from '../services';
import { LocalizedMessages } from '../application';

@authenticate('jwt.access')
@authorize({ allowedRoles: ['GOLD'], voters: [basicAuthorization] })
export class JointAccountController {
  private readonly userId: number;
  lang: string;

  constructor(
    @repository(JointAccountsRepository)
    protected jointAccountsRepo: JointAccountsRepository,
    @repository(JointAccountSubscribesRepository)
    protected jointAccSubscribesRepo: JointAccountSubscribesRepository,
    @repository(UsersRelsRepository)
    protected usersRelsRepo: UsersRelsRepository,
    @repository(UsersRepository) protected usersRepo: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
    @service(FirebaseService) private firebaseSerice: FirebaseService,
    @inject.context() public ctx: RequestContext,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.lang = this.ctx.request.headers['accept-language'] ?? 'fa';
  }

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
    jointAccountsReq: Omit<JointRequest, 'jointAccountsId'>,
  ): Promise<JointResponse> {
    const firebaseMessages: BatchMessage = [];
    const JA = await this.jointAccountsRepo.create({
      userId: this.userId,
      title: jointAccountsReq.title,
      description: jointAccountsReq.description,
    });

    const currentUser = await this.usersRepo.findById(this.userId, {
      fields: { userId: true, phone: true },
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
            where: { phone: ur.phone },
            include: [
              { relation: 'usersRels', scope: { where: { phone: currentUser.phone } } },
              { relation: 'setting' },
            ],
          });

          jsList.push({ jointAccountId: JA.jointAccountId, userId: user!.getId() });

          if (ur.type !== 'self') {
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
              createdAt: JA.createdAt,
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
              },
            });
          }
        }

        await this.firebaseSerice.sendAllMessage(firebaseMessages);
        await this.jointAccSubscribesRepo.createAll(jsList);
      });

    return {
      jointAccountId: JA.getId(),
      createdAt: JA.createdAt,
      ...jointAccountsReq,
    };
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

    const jsas = await this.jointAccSubscribesRepo.find({
      fields: { jointAccountId: true },
      where: { userId: this.userId },
    });

    const jaIds = jsas.map((jsa) => jsa.jointAccountId);

    const JAs = await this.jointAccountsRepo.find({
      fields: { userId: false },
      where: { jointAccountId: { inq: jaIds } },
      include: [{ relation: 'jointAccountSubscribes' }],
    });

    for (const ja of JAs) {
      const userRelIds: Array<number> = [];
      for (const jas of ja.jointAccountSubscribes) {
        const u = await this.usersRepo.findById(jas.userId, {
          fields: { userId: true, phone: true },
        });

        const userRel = await this.usersRelsRepo.findOne({
          fields: { userRelId: true, userId: true, phone: true },
          where: { userId: this.userId, phone: u.phone },
        });

        userRelIds.push(userRel?.getId());
      }

      result.push(
        new JointResponse({
          jointAccountId: ja.getId(),
          title: ja.title,
          description: ja.title,
          userRelIds: userRelIds,
          createdAt: ja.createdAt,
        }),
      );
    }

    return result;
  }

  @del('/joint-accounts/{jointAccountId}', {
    summary: 'DELETE a JointAccount by jointAccountId',
    description: 'Also delete all dongs belongs to',
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
    const countDeleted = await this.usersRepo
      .jointAccounts(this.userId)
      .delete({ jointAccountId: jointAccountId });

    if (countDeleted.count !== 1) {
      const errMsg = this.locMsg['JOINT_NOT_BELONG_USER'][this.lang];
      throw new HttpErrors.UnprocessableEntity(errMsg);
    }
  }

  // @del('/joint-accounts/', {
  //   summary: 'DELETE all JointAccounts',
  //   description: 'Also delete all dongs belongs to',
  //   security: OPERATION_SECURITY_SPEC,
  //   responses: {
  //     '200': {
  //       description: 'Count DELETE JointAccounts',
  //       content: {
  //         'application/json': {
  //           schema: CountSchema,
  //         },
  //       },
  //     },
  //   },
  // })
  // async deleteAllJointAccounts(): Promise<Count> {
  //   try {
  //     return await this.jointService.delete(this.userId);
  //   } catch (err) {
  //     throw new HttpErrors.UnprocessableEntity(err);
  //   }
  // }
}
