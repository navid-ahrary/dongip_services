import {
  inject,
  injectable,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  service,
  ValueOrPromise,
} from '@loopback/core';
import { repository } from '@loopback/repository';
import { HttpErrors, Request, RestBindings } from '@loopback/rest';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import ct from 'countries-and-timezones';
import _ from 'lodash';
import moment from 'moment-timezone';
import util from 'util';
import { LocMsgsBindings } from '../keys';
import {
  DongsRepository,
  JointAccountsRepository,
  JointAccountSubscribesRepository,
  UsersRelsRepository,
  UsersRepository,
} from '../repositories';
import { BatchMessage, FirebaseService, PhoneNumberService } from '../services';
import { LocalizedMessages } from '../types';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@injectable({ tags: { key: JointAccountsInterceptor.BINDING_KEY } })
export class JointAccountsInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${JointAccountsInterceptor.name}`;
  private readonly userId: number;
  private readonly phone: string;

  constructor(
    @repository(UsersRepository) private usersRepo: UsersRepository,
    @repository(DongsRepository) private dongRepo: DongsRepository,
    @repository(JointAccountsRepository) private jointAccountsRepo: JointAccountsRepository,
    @repository(JointAccountSubscribesRepository)
    private jointAccSubscRepo: JointAccountSubscribesRepository,
    @repository(UsersRelsRepository) private usersRelsRepo: UsersRelsRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @service(FirebaseService) private firebaseSerice: FirebaseService,
    @service(PhoneNumberService) private phoneNumService: PhoneNumberService,
    @inject(LocMsgsBindings) private locMsg: LocalizedMessages,
    @inject(RestBindings.Http.REQUEST) private req: Request,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.phone = this.currentUserProfile.phone;
  }

  /**
   * This method is used by LoopBack context to produce an interceptor function
   * for the binding.
   *
   * @returns An interceptor function
   */
  value() {
    return this.intercept.bind(this);
  }

  /**
   * The logic to intercept an invocation
   * @param invocationCtx - Invocation context
   * @param next - A function to invoke next interceptor or the target method
   */
  async intercept(invocationCtx: InvocationContext, next: () => ValueOrPromise<InvocationResult>) {
    const lang = _.includes(this.req.headers['accept-language'], 'en') ? 'en' : 'fa';
    const methodName = invocationCtx.methodName;
    const firebaseMessages: BatchMessage = [];

    try {
      if (methodName === 'deleteAllJointAccounts' || methodName === 'deleteJointAccountById') {
        // Joint accounts belong to current user
        const jointId = invocationCtx.args[0];
        const JAs = await this.jointAccountsRepo.find({
          where: { userId: this.userId, jointAccountId: jointId },
          include: [
            {
              relation: 'jointAccountSubscribes',
              scope: {
                include: [
                  {
                    relation: 'user',
                    scope: {
                      fields: { userId: true, phone: true, firebaseToken: true, region: true },
                      include: [
                        {
                          relation: 'setting',
                          scope: { fields: { userId: true, language: true } },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        });

        if (JAs.length && JAs[0].jointAccountSubscribes) {
          const currentUserJAS = _.find(
            JAs[0].jointAccountSubscribes,
            jass => jass.userId === this.userId,
          );
          const currentUser = currentUserJAS!.user;

          for (const JA of JAs) {
            const JASs = JA.jointAccountSubscribes;
            const externalJASs = _.filter(JASs, jass => jass.userId !== this.userId);

            for (const JAS of externalJASs) {
              const targetUser = JAS.user;
              const timezone = ct.getTimezonesForCountry(targetUser.region!)![0].name;
              const time = moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

              const mutualRel = await this.usersRelsRepo.findOne({
                fields: { name: true },
                where: { userId: targetUser.getId(), phone: currentUser.phone, deleted: false },
              });

              const savedNotify = await this.usersRepo.notifications(targetUser.getId()).create({
                jointAccountId: JA.getId(),
                type: 'jointAccount',
                title: this.locMsg['DELETE_JOINT_NOTIFY_TITLE'][targetUser.setting.language],
                body: util.format(
                  this.locMsg['DELETE_JOINT_NOTIFY_BODY'][targetUser.setting.language],
                  JA.title,
                  mutualRel?.name ?? 'ناشناس',
                ),
                createdAt: time,
              });

              firebaseMessages.push({
                token: targetUser.firebaseToken ?? ' ',
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
        }

        // Joint accounts than no belongs to current user
        const JASs = await this.jointAccSubscRepo.find({
          where: { userId: this.userId, jointAccountId: jointId },
          include: [
            { relation: 'jointAccount', scope: { where: { userId: { neq: this.userId } } } },
          ],
        });

        const JASsValid = JASs.filter(jass => jass.jointAccount);
        const jointIds = _.map(JASsValid, jass => jass.jointAccountId);

        const joints = await this.jointAccountsRepo.find({
          where: { jointAccountId: { inq: jointIds } },
          include: [
            {
              relation: 'jointAccountSubscribes',
              scope: {
                where: { userId: { neq: this.userId } },
                include: [
                  {
                    relation: 'user',
                    scope: {
                      fields: { userId: true, phone: true, firebaseToken: true, region: true },
                      include: [
                        {
                          relation: 'setting',
                          scope: { fields: { userId: true, language: true } },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        });

        for (const j of joints) {
          const subscribes = j.jointAccountSubscribes;

          for (const sub of subscribes) {
            const user = sub.user;
            const setting = sub.user.setting;
            const timezone = ct.getTimezonesForCountry(user.region!)![0].name;
            const time = moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

            const mutualRel = await this.usersRelsRepo.findOne({
              fields: { name: true },
              where: { userId: user.getId(), phone: this.phone, deleted: false },
            });

            const savedNotify = await this.usersRepo.notifications(user.getId()).create({
              jointAccountId: j.getId(),
              type: 'jointAccount',
              title: util.format(this.locMsg['LEAVE_JOINT_NOTIFY_TITLE'][setting.language]),
              body: util.format(
                this.locMsg['LEAVE_JOINT_NOTIFY_BODY'][setting.language],
                mutualRel?.name ?? 'ناشناس',
                j.title,
              ),
              createdAt: time,
            });

            firebaseMessages.push({
              token: user.firebaseToken!,
              notification: {
                title: savedNotify.title,
                body: savedNotify.body,
              },
              data: {
                notifyId: savedNotify.getId().toString(),
                title: savedNotify.title,
                body: savedNotify.body,
                jointAccountId: j.getId().toString(),
                type: savedNotify.type,
                silent: 'false',
              },
            });
          }
        }

        if (firebaseMessages.length) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.firebaseSerice.sendAllMessage(firebaseMessages);
        }
      }

      if (methodName === 'deleteDongsById') {
        const dongId = invocationCtx.args[0];
        const foundDongs = await this.dongRepo.find({
          fields: { dongId: true, originDongId: true, userId: true, jointAccountId: true },
          where: { dongId: dongId, userId: this.userId },
          include: [
            {
              relation: 'jointAccount',
              scope: {
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
                              phone: true,
                              firebaseToken: true,
                              region: true,
                            },
                            where: { userId: { neq: this.userId } },
                            include: [
                              {
                                relation: 'setting',
                                scope: { fields: { userId: true, language: true } },
                              },
                              {
                                relation: 'usersRels',
                                scope: {
                                  where: { phone: this.phone, type: 'external' },
                                },
                              },
                            ],
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
        const foundDong = foundDongs[0];

        const jointAcc = foundDong?.jointAccount;

        if (!foundDong) {
          throw this.locMsg['DONG_NOT_VALID'][lang];
        } else if (jointAcc && jointAcc.userId !== this.userId) {
          const jointSub = await this.jointAccSubscRepo.findOne({
            where: { userId: this.userId, jointAccountId: jointAcc.getId() },
          });
          if (foundDong.originDongId && jointSub) {
            throw util.format(this.locMsg['JOINT_ADMIN_DELETE_DONG_ERROR'][lang], jointAcc.title);
          }
        }

        const result = await next();

        if (jointAcc) {
          if (foundDong.originDongId) {
            await this.dongRepo.updateById(foundDong.originDongId, { deleted: true });
          }

          const jointAccountSubs = jointAcc.jointAccountSubscribes;
          const users = _.map(jointAccountSubs, j => j.user);
          _.remove(users, user => typeof user !== 'object');

          for (const user of users) {
            const timezone = ct.getTimezonesForCountry(
              user.region ?? this.phoneNumService.getRegionCodeISO(user.phone!),
            )![0].name;
            const time = moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

            const savedNotify = await this.usersRepo.notifications(user.getId()).create({
              dongId: dongId,
              jointAccountId: jointAcc!.getId(),
              type: 'dong-jointAccount',
              title: util.format(
                this.locMsg['DELETE_DONG_BELONG_TO_JOINT_TITLE'][user.setting.language],
              ),
              body: util.format(
                this.locMsg['DELETE_DONG_BELONG_TO_JOINT_BODY'][user.setting.language],
                jointAcc.title,
                user.usersRels[0].name,
              ),
              createdAt: time,
            });

            firebaseMessages.push({
              token: user.firebaseToken ?? ' ',
              notification: {
                title: savedNotify.title,
                body: savedNotify.body,
              },
              data: {
                notifyId: savedNotify.getId().toString(),
                title: savedNotify.title,
                body: savedNotify.body,
                jointAccountId: jointAcc.getId().toString(),
                type: savedNotify.type,
                silent: 'false',
              },
            });
          }

          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          if (firebaseMessages.length) this.firebaseSerice.sendAllMessage(firebaseMessages);
        }

        return result;
      }

      if (methodName === 'deleteAllDongs') {
        const foundDongsInJoint = await this.dongRepo.find({
          fields: { dongId: true, originDongId: true, userId: true, jointAccountId: true },
          where: { userId: this.userId, originDongId: null!, jointAccountId: { neq: null! } },
          include: [
            {
              relation: 'jointAccount',
              scope: {
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
                              phone: true,
                              firebaseToken: true,
                              region: true,
                            },
                            where: { userId: { neq: this.userId } },
                            include: [
                              {
                                relation: 'setting',
                                scope: { fields: { userId: true, language: true } },
                              },
                              {
                                relation: 'usersRels',
                                scope: {
                                  where: { phone: this.phone, type: 'external' },
                                },
                              },
                            ],
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

        const result = await next();

        for (const foundDong of foundDongsInJoint) {
          const jointAcc = foundDong.jointAccount!;
          const dongId = foundDong.getId();

          if (foundDong.originDongId) {
            await this.dongRepo.updateById(foundDong.originDongId, { deleted: true });
          }

          const jointAccountSubs = jointAcc.jointAccountSubscribes;
          const users = _.map(jointAccountSubs, j => j.user);
          _.remove(users, user => typeof user !== 'object');

          for (const user of users) {
            const timezone = ct.getTimezonesForCountry(
              user.region ?? this.phoneNumService.getRegionCodeISO(user.phone!),
            )![0].name;

            const time = moment.tz(timezone).format('YYYY-MM-DDTHH:mm:ss+00:00');

            const savedNotify = await this.usersRepo.notifications(user.getId()).create({
              dongId: dongId,
              jointAccountId: jointAcc!.getId(),
              type: 'dong-jointAccount',
              title: util.format(
                this.locMsg['DELETE_DONG_BELONG_TO_JOINT_TITLE'][user.setting.language],
              ),
              body: util.format(
                this.locMsg['DELETE_DONG_BELONG_TO_JOINT_BODY'][user.setting.language],
                jointAcc.title,
                user.usersRels[0].name,
              ),
              createdAt: time,
            });

            firebaseMessages.push({
              token: user.firebaseToken ?? ' ',
              notification: {
                title: savedNotify.title,
                body: savedNotify.body,
              },
              data: {
                notifyId: savedNotify.getId().toString(),
                title: savedNotify.title,
                body: savedNotify.body,
                jointAccountId: jointAcc.getId().toString(),
                type: savedNotify.type,
                silent: 'false',
              },
            });
          }
        }

        //  eslint-disable-next-line @typescript-eslint/no-floating-promises
        if (firebaseMessages.length) this.firebaseSerice.sendAllMessage(firebaseMessages);

        return result;
      }

      const result = await next();
      return result;
    } catch (err) {
      console.error('Error:', err);
      throw new HttpErrors.UnprocessableEntity(err);
    }
  }
}
