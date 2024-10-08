import {
  bind,
  inject,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import { repository } from '@loopback/repository';
import { HttpErrors, Request, RestBindings } from '@loopback/rest';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import _ from 'lodash';
import { LocMsgsBindings } from '../keys';
import { UsersRelsRepository, UsersRepository } from '../repositories';
import { LocalizedMessages } from '../types';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({ tags: { key: ValidateUsersRelsInterceptor.BINDING_KEY } })
export class ValidateUsersRelsInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateUsersRelsInterceptor.name}`;
  private readonly userId: number;

  constructor(
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(UsersRelsRepository) public usersRelsRepository: UsersRelsRepository,
  ) {
    this.userId = +this.currentUserProfile[securityId];
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
    const lang = _.includes(this.req.headers['accept-lang'], 'en') ? 'en' : 'fa';

    let errMsg: string;

    try {
      if (invocationCtx.methodName === 'createGroups') {
        const userRelIds = invocationCtx.args[0].userRelIds;

        const countUserRels = await this.usersRelsRepository.count({
          userId: this.userId,
          userRelId: { inq: userRelIds },
        });

        if (countUserRels.count !== userRelIds.length) {
          errMsg = this.locMsg['SOME_USERS_RELS_NOT_VALID'][lang];
          throw new Error(errMsg);
        }
      } else if (invocationCtx.methodName === 'patchGroupsById') {
        if (invocationCtx.args[1].userRelIds) {
          const userRelIds = invocationCtx.args[1].userRelIds;

          const countUserRels = await this.usersRelsRepository.count({
            userId: this.userId,
            userRelId: { inq: userRelIds },
          });

          if (countUserRels.count !== userRelIds.length) {
            errMsg = this.locMsg['SOME_USERS_RELS_NOT_VALID'][lang];
            throw new Error(errMsg);
          }
        }
      } else if (
        invocationCtx.methodName === 'updateUsersRelsById' ||
        invocationCtx.methodName === 'deleteUsersRelsById'
      ) {
        const userRelId = invocationCtx.args[0];
        const foundUserRel = await this.usersRelsRepository.findOne({
          where: {
            userRelId: userRelId,
            userId: this.userId,
            type: { neq: 'self' },
          },
        });

        if (!foundUserRel) {
          errMsg = this.locMsg['USER_REL_NOT_VALID'][lang];
          throw new Error(errMsg);
        }
      } else if (
        invocationCtx.methodName === 'createJointAccount' ||
        invocationCtx.methodName === 'updateJointById'
      ) {
        const userRelIds: number[] = invocationCtx.args[0].userRelIds;
        if (userRelIds) {
          const user = await this.usersRepository.findById(this.userId, {
            fields: { userId: true, phone: true },
            include: [
              {
                relation: 'usersRels',
                scope: {
                  fields: { userId: true, userRelId: true, mutualUserRelId: true, phone: true },
                  where: { userRelId: { inq: userRelIds } },
                },
              },
            ],
          });

          if (user.usersRels?.length !== userRelIds.length) {
            errMsg = this.locMsg['JOINT_USER_REL_BI_ERR'][lang];
            throw new Error(errMsg);
          }

          const invalidRels = user.usersRels.filter(rel => rel.mutualUserRelId === null);
          if (invalidRels.length) {
            for (const rel of invalidRels) {
              const phone = rel.phone;
              const targetUserWithRel = await this.usersRepository.findOne({
                fields: { userId: true, phone: true },
                where: { phone: phone },
                include: [{ relation: 'usersRels', scope: { where: { phone: user.phone } } }],
              });

              if (targetUserWithRel?.usersRels) {
                const mRel = targetUserWithRel.usersRels[0];
                await this.usersRelsRepository.updateById(rel.getId(), {
                  mutualUserRelId: mRel.getId(),
                });
                await this.usersRelsRepository.updateById(mRel.getId(), {
                  mutualUserRelId: rel.getId(),
                });
              } else {
                errMsg = this.locMsg['JOINT_USER_REL_BI_ERR'][lang];
                throw new Error(errMsg);
              }
            }
          }
        }
      }
    } catch (err) {
      throw new HttpErrors.UnprocessableEntity(err.message);
    }

    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
