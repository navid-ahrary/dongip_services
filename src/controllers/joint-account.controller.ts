import { repository, DataObject } from '@loopback/repository';
import {
  post,
  get,
  getModelSchemaRef,
  requestBody,
  param,
  del,
  RequestContext,
  patch,
  HttpErrors,
} from '@loopback/rest';
import { intercept, inject, service } from '@loopback/core';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';

import util from 'util';
import moment from 'moment';
import _ from 'lodash';
import 'moment-timezone';
import ct from 'countries-and-timezones';

import {
  JointRequest,
  JointResponse,
  JointAccountSubscribes,
  JointAccountsWithRelations,
} from '../models';
import {
  DongsRepository,
  JointAccountsRepository,
  JointAccountSubscribesRepository,
  UsersRelsRepository,
  UsersRepository,
} from '../repositories';
import { ValidateUsersRelsInterceptor, JointAccountsInterceptor } from '../interceptors';
import { basicAuthorization, BatchMessage, FirebaseService, PhoneNumberService } from '../services';
import { LocalizedMessages } from '../application';

@intercept(ValidateUsersRelsInterceptor.BINDING_KEY, JointAccountsInterceptor.BINDING_KEY)
@authenticate('jwt.access')
@authorize({ allowedRoles: ['GOLD'], voters: [basicAuthorization] })
export class JointAccountController {
  private readonly userId: number;
  private readonly phone: string;
  lang: string;

  constructor(
    @inject.context() public ctx: RequestContext,
    @repository(JointAccountSubscribesRepository)
    protected jointAccSubscribesRepo: JointAccountSubscribesRepository,
    @repository(UsersRepository) protected usersRepo: UsersRepository,
    @service(FirebaseService) protected firebaseSerice: FirebaseService,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
    @service(PhoneNumberService) private phoneNumService: PhoneNumberService,
    @inject('application.localizedMessages') protected locMsg: LocalizedMessages,
    @repository(UsersRelsRepository) protected usersRelsRepo: UsersRelsRepository,
    @repository(DongsRepository) protected dongRepo: DongsRepository,
    @repository(JointAccountsRepository) protected jointAccountsRepo: JointAccountsRepository,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.phone = this.currentUserProfile.phone;
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
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

    const urs = await this.usersRelsRepo.find({
      fields: { userId: true, phone: true, type: true },
      where: {
        userId: this.userId,
        userRelId: { inq: jointAccountsReq.userRelIds },
      },
    });
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
          title: util.format(this.locMsg['NEW_JOINT_ACCOUNT_NOTIFY_TITLE'][user!.setting.language]),
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

    await this.jointAccSubscribesRepo.createAll(jsList);

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.firebaseSerice.sendAllMessage(firebaseMessages);

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
    @param.path.number('jointAccountId', { required: true }) jointAccountId: number,
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

  @del('/joint-accounts/', {
    summary: 'Delete and left from all JointAccounts',
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

  @patch('joint-accounts/{jointAccountId}', {
    summary: 'Update a JointAccount by jointAccountId. Just admin can update',
    security: OPERATION_SECURITY_SPEC,
    responses: { '204': { description: 'No content' } },
  })
  async updateJointById(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(JointRequest, {
            title: 'PatchJointAccounts',
            partial: true,
          }),
        },
      },
    })
    patchReqBody: JointRequest,
    @param.path.number('jointAccountId', { required: true }) jointAccountId: number,
  ) {
    const JA = await this.jointAccountsRepo.findOne({
      where: { jointAccountId: jointAccountId, userId: this.userId },
      include: [
        {
          relation: 'jointAccountSubscribes',
          scope: {
            include: [
              {
                relation: 'user',
                scope: {
                  fields: {
                    userId: true,
                    region: true,
                    phone: true,
                    firebaseToken: true,
                    name: true,
                  },
                  include: [
                    {
                      relation: 'setting',
                      scope: { fields: { userId: true, language: true } },
                    },
                    {
                      relation: 'usersRels',
                      scope: {
                        fields: {
                          userRelId: true,
                          mutualUserRelId: true,
                          userId: true,
                          phone: true,
                          name: true,
                        },
                        where: { phone: this.phone },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    });

    if (!JA) {
      throw new HttpErrors.UnprocessableEntity(this.locMsg['JOINT_NOT_VALID'][this.lang]);
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.performPatch(JA, patchReqBody);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  async performPatch(JA: JointAccountsWithRelations, patchReqBody: JointRequest) {
    const notifyMsgs: BatchMessage = [];

    const jointAccountId = JA.getId();
    const JASs = JA.jointAccountSubscribes;
    const currentUsers = _.map(JASs, (jass) => jass.user);

    const props = _.pick(patchReqBody, ['title', 'description']);
    if (_.has(props, 'title')) {
      await this.usersRepo
        .jointAccounts(this.userId)
        .patch(props, { jointAccountId: jointAccountId });

      // Notify for joint memebers instead of current user
      for (const user of currentUsers.filter((u) => u.userId !== this.userId)) {
        const timezone = ct.getTimezonesForCountry(
          user!.region ?? this.phoneNumService.getRegionCodeISO(user.phone!),
        )[0].name;
        const time = moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

        const savedNotify = await this.usersRepo.notifications(user?.getId()).create({
          jointAccountId: JA.getId(),
          type: 'jointAccount',
          title: util.format(
            this.locMsg['UPDATE_JOINT_ACCOUNT_NOTIFY_TITLE'][user.setting.language],
            JA.title,
          ),
          body: util.format(
            this.locMsg['UPDATE_TITLE_JOINT_ACCOUNT_NOTIFY_BODY'][user.setting.language],
            props.title,
          ),
          createdAt: time,
        });

        notifyMsgs.push({
          token: user.firebaseToken ?? '',
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

    if (_.has(patchReqBody, 'userRelIds')) {
      const currentUsersPhones: string[] = _.map(currentUsers, (user) => user.phone!);

      const desiredUsersRels = await this.usersRepo.usersRels(this.userId).find({
        fields: { userId: true, userRelId: true, phone: true, name: true },
        where: { userRelId: { inq: patchReqBody.userRelIds } },
      });
      const desiredUsersPhones: string[] = _.map(desiredUsersRels, (rel) => rel.phone);

      const deletedUserPhones: string[] = _.difference(currentUsersPhones, desiredUsersPhones);
      const addedUserPhones: string[] = _.difference(desiredUsersPhones, currentUsersPhones);

      const deletedUsers = _.filter(currentUsers, (user) =>
        _.includes(deletedUserPhones, user.phone!),
      );
      const addedUsers = await this.usersRepo.find({
        fields: { userId: true, region: true, firebaseToken: true, phone: true, name: true },
        where: { phone: { inq: addedUserPhones } },
        include: [{ relation: 'setting' }],
      });
      const fixedUsers = _.filter(
        currentUsers,
        (user) => !_.includes(deletedUserPhones, user.phone),
      );

      if (deletedUsers.length) {
        const deletedUsersIds = _.map(deletedUsers, (user) => user.userId);

        await this.jointAccountsRepo
          .jointAccountSubscribes(jointAccountId)
          .delete({ userId: { inq: deletedUsersIds } });

        await this.dongRepo.updateAll(
          { jointAccountId: undefined, originDongId: undefined },
          { userId: { inq: deletedUsersIds }, jointAccountId: jointAccountId },
        );
      }

      const addedUsersIds = _.map(addedUsers, (user) => user.userId);
      const jointSubs: JointAccountSubscribes[] = [];
      addedUsersIds.forEach((id) => {
        jointSubs.push(
          new JointAccountSubscribes({
            userId: id,
            jointAccountId: jointAccountId,
          }),
        );
      });
      if (jointSubs.length) {
        await this.jointAccSubscribesRepo.createAll(jointSubs);
      }

      // Notify for joint memebers except current user
      for (const user of fixedUsers.filter((u) => u.userId !== this.userId)) {
        const timezone = ct.getTimezonesForCountry(user.region!)[0].name;
        const time = moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

        for (const aUser of addedUsers) {
          const targetRel = await this.usersRelsRepo.findOne({
            fields: { userId: true, name: true },
            where: { userId: user.getId(), phone: aUser.phone },
          });
          const savedNotify = await this.usersRepo.notifications(user.getId()).create({
            jointAccountId: JA.getId(),
            type: 'jointAccount',
            title: util.format(
              this.locMsg['UPDATE_JOINT_ACCOUNT_NOTIFY_TITLE'][user.setting.language],
              props.title ?? JA.title,
            ),
            body: util.format(
              this.locMsg['ADD_MEMBERS_JOINT_ACCOUNT_NOTIFY_BODY'][user.setting.language],
              targetRel?.name ?? aUser.name,
            ),
            createdAt: time,
          });

          notifyMsgs.push({
            token: user.firebaseToken ?? '',
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

        for (const dUser of deletedUsers) {
          const targetRel = await this.usersRelsRepo.findOne({
            fields: { userId: true, name: true },
            where: { userId: user.getId(), phone: dUser.phone },
          });
          const savedNotify = await this.usersRepo.notifications(user.getId()).create({
            jointAccountId: JA.getId(),
            type: 'jointAccount',
            title: util.format(
              this.locMsg['UPDATE_JOINT_ACCOUNT_NOTIFY_TITLE'][user.setting.language],
              props.title ?? JA.title,
            ),
            body: util.format(
              this.locMsg['DELETE_MEMBERS_JOINT_ACCOUNT_NOTIFY_BODY'][user.setting.language],
              targetRel?.name ?? dUser.name,
            ),
            createdAt: time,
          });

          notifyMsgs.push({
            token: user.firebaseToken ?? '',
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

      // Notify to added user
      for (const user of addedUsers) {
        const timezone = ct.getTimezonesForCountry(user.region!)[0].name;
        const time = moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

        const targetRel = await this.usersRelsRepo.findOne({
          fields: { userId: true, name: true },
          where: { userId: user.getId(), phone: this.phone },
        });
        const savedNotify = await this.usersRepo.notifications(user.getId()).create({
          jointAccountId: JA.getId(),
          type: 'jointAccount',
          title: util.format(
            this.locMsg['UPDATE_JOINT_ACCOUNT_NOTIFY_TITLE'][user.setting.language],
            props.title ?? JA.title,
          ),
          body: util.format(
            this.locMsg['NEW_JOINT_ACCOUNT_NOTIFY_BODY'][user.setting.language],
            targetRel?.name,
            props.title ?? JA.title,
          ),
          createdAt: time,
        });

        notifyMsgs.push({
          token: user.firebaseToken ?? '',
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

      // Notify to deleted user
      for (const user of deletedUsers) {
        const timezone = ct.getTimezonesForCountry(user.region!)[0].name;
        const time = moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

        const targetRel = await this.usersRelsRepo.findOne({
          fields: { userId: true, name: true },
          where: { userId: user.getId(), phone: this.phone },
        });
        const savedNotify = await this.usersRepo.notifications(user.getId()).create({
          jointAccountId: JA.getId(),
          type: 'jointAccount',
          title: util.format(
            this.locMsg['UPDATE_JOINT_ACCOUNT_NOTIFY_TITLE'][user.setting.language],
            props.title ?? JA.title,
          ),
          body: util.format(
            this.locMsg['DELETE_YOU_JOINT_ACCOUNT_NOTIFY_BODY'][user.setting.language],
            targetRel?.name,
            JA.title,
          ),
          createdAt: time,
        });

        notifyMsgs.push({
          token: user.firebaseToken ?? '',
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

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    if (notifyMsgs.length) this.firebaseSerice.sendAllMessage(notifyMsgs);
  }

  @del('/groups/', {
    security: OPERATION_SECURITY_SPEC,
    responses: { '204': { description: 'No content' } },
  })
  del() {}

  // @patch('/joint-account/{jointAccountId}/delete/{userRelId}', { responses: { 204: '' } })
  // async deleteRelFromJointAccount() {}

  // @patch('/joint-account/{jointAccountId}/add/{userRelId}', {
  //   security: OPERATION_SECURITY_SPEC,
  //   responses: { 200: '' },
  // })
  // async addRelFromJointAccount(
  //   @param.path.number('jointAccountId', { required: true }) jointAccountId: number,
  //   @param.path.number('userRelId', { required: true }) userRelId: number,
  // ) {
  //   const notifyMsgs: BatchMessage = [];
  //   const JA = await this.jointAccountsRepo.findOne({
  //     where: { jointAccountId: jointAccountId, userId: this.userId },
  //     include: [
  //       {
  //         relation: 'jointAccountSubscribes',
  //         scope: {
  //           include: [
  //             {
  //               relation: 'user',
  //               scope: {
  //                 fields: { userId: true, region: true, phone: true, firebaseToken: true },
  //                 include: [
  //                   {
  //                     relation: 'setting',
  //                     scope: { fields: { userId: true, language: true } },
  //                   },
  //                   {
  //                     relation: 'usersRels',
  //                     scope: {
  //                       fields: {
  //                         userRelId: true,
  //                         mutualUserRelId: true,
  //                         userId: true,
  //                         phone: true,
  //                         name: true,
  //                       },
  //                       where: { phone: this.phone },
  //                     },
  //                   },
  //                 ],
  //               },
  //             },
  //           ],
  //         },
  //       },
  //     ],
  //   });

  //   if (!JA) {
  //     throw new HttpErrors.UnprocessableEntity(this.locMsg['JOINT_NOT_VALID'][this.lang]);
  //   }

  //   const JASs = JA.jointAccountSubscribes;
  //   const currentUsers = _.map(JASs, (jass) => jass.user);

  //   const userRel = await this.usersRelsRepo.findOne({
  //     fields: { mutualUserRelId: true, phone: true },
  //     where: { userId: this.userId, userRelId: userRelId },
  //   });

  //   const targetUser = await this.usersRepo.findOne({
  //     fields: { userId: true, region: true, phone: true },
  //     where: { phone: userRel?.phone },
  //     include: [
  //       {
  //         relation: 'usersRels',
  //         scope: {
  //           where: { userRelId: userRel?.mutualUserRelId },
  //           fields: { userId: true, name: true, phone: true },
  //         },
  //       },
  //       { relation: 'setting', scope: { fields: { language: true, userId: true } } },
  //     ],
  //   });

  //   const jointSub = new JointAccountSubscribes({
  //     userId: targetUser?.getId(),
  //     jointAccountId: jointAccountId,
  //   });
  //   await this.jointAccSubscribesRepo.create(jointSub);

  //   // Notify for joint memebers instead of current user
  //   for (const user of currentUsers.filter((u) => u.userId !== this.userId)) {
  //     const timezone = ct.getTimezonesForCountry(user.region!)[0].name;
  //     const time = moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

  //     const targetRel = await this.usersRelsRepo.findOne({
  //       fields: { userId: true, name: true },
  //       where: { userId: user.getId(), phone: targetUser!.phone },
  //     });
  //     const savedNotify = await this.usersRepo.notifications(user.getId()).create({
  //       jointAccountId: JA.getId(),
  //       type: 'jointAccount',
  //       title: util.format(
  //         this.locMsg['UPDATE_JOINT_ACCOUNT_NOTIFY_TITLE'][user.setting.language],
  //         JA.title,
  //       ),
  //       body: util.format(
  //         this.locMsg['ADD_MEMBERS_JOINT_ACCOUNT_NOTIFY_BODY'][user.setting.language],
  //         targetRel?.name ?? targetUser!.name,
  //       ),
  //       createdAt: time,
  //     });

  //     notifyMsgs.push({
  //       token: user.firebaseToken ?? '',
  //       notification: {
  //         title: savedNotify.title,
  //         body: savedNotify.body,
  //       },
  //       data: {
  //         notifyId: savedNotify.getId().toString(),
  //         title: savedNotify.title,
  //         body: savedNotify.body,
  //         jointAccountId: JA.getId().toString(),
  //         type: savedNotify.type,
  //         silent: 'false',
  //       },
  //     });
  //   }

  //   // eslint-disable-next-line @typescript-eslint/no-floating-promises
  //   if (notifyMsgs.length) this.firebaseSerice.sendAllMessage(notifyMsgs);
  // }
}
