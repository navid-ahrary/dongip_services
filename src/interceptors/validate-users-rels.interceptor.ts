import {
  inject,
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import { repository } from '@loopback/repository';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';

import { UsersRelsRepository, UsersRepository } from '../repositories';
import { HttpErrors, Request, RestBindings } from '@loopback/rest';
import { LocalizedMessages } from '../application';
import { sample } from 'lodash';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({ tags: { key: ValidateUsersRelsInterceptor.BINDING_KEY } })
export class ValidateUsersRelsInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateUsersRelsInterceptor.name}`;
  private readonly userId: number;
  lang: string;

  constructor(
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
    @inject(RestBindings.Http.REQUEST) private req: Request,
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
    this.lang = this.req.headers['accept-language'] ?? 'fa';

    let errMsg: string;

    try {
      if (invocationCtx.methodName === 'createGroups') {
        const userRelIds = invocationCtx.args[0].userRelIds;

        const countUserRels = await this.usersRelsRepository.count({
          userId: this.userId,
          userRelId: { inq: userRelIds },
        });

        if (countUserRels.count !== userRelIds.length) {
          errMsg = this.locMsg['SOME_USERS_RELS_NOT_VALID'][this.lang];
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
            errMsg = this.locMsg['SOME_USERS_RELS_NOT_VALID'][this.lang];
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
          errMsg = this.locMsg['USER_REL_NOT_VALID'][this.lang];
          throw new Error(errMsg);
        }
      } else if (invocationCtx.methodName === 'createJointAccount') {
        const userRelIds = invocationCtx.args[0].userRelIds;

        const foundUrs = await this.usersRepository.usersRels(this.userId).find({
          fields: { userRelId: true, mutualUserRelId: true },
          where: {
            userId: this.userId,
            userRelId: { inq: userRelIds },
            mutualUserRelId: { neq: null! },
          },
        });

        if (foundUrs.length !== userRelIds.length) {
          errMsg = this.locMsg['SOME_USERS_RELS_NOT_VALID'][this.lang];
          throw new Error(errMsg);
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
