import {
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
  inject,
} from '@loopback/core';
import {repository} from '@loopback/repository';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {HttpErrors, Request, RestBindings} from '@loopback/rest';

import {GroupsRepository} from '../repositories';
import {LocalizedMessages} from '../application';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidateGroupIdInterceptor.BINDING_KEY}})
export class ValidateGroupIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateGroupIdInterceptor.name}`;
  private readonly userId: number;
  lang: string;

  constructor(
    @repository(GroupsRepository)
    public groupsRepository: GroupsRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
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
  async intercept(
    invocationCtx: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ) {
    this.lang = this.req.headers['accept-language']
      ? this.req.headers['accept-language']
      : 'fa';

    if (invocationCtx.methodName === 'createDongs') {
      if (invocationCtx.args[0].groupId) {
        const groupId = invocationCtx.args[0].groupId;

        await this.groupsRepository
          .findOne({
            where: {userId: this.userId, groupId: groupId},
          })
          .then((result) => {
            if (!result) {
              const errMsg = this.locMsg['GROUP_NOT_VALID'][this.lang];
              throw new HttpErrors.UnprocessableEntity(errMsg);
            }
          });
      }
    } else if (
      invocationCtx.methodName === 'deleteGroupsByIdAllDongs' ||
      invocationCtx.methodName === 'deleteGroupsById' ||
      invocationCtx.methodName === 'findGroupsDongsByGroupId' ||
      invocationCtx.methodName === 'patchGroupsById' ||
      invocationCtx.methodName === 'findGroupsBudgets' ||
      invocationCtx.methodName === 'createGroupsBudgets'
    ) {
      const groupId = invocationCtx.args[0];

      await this.groupsRepository
        .findOne({
          where: {userId: this.userId, groupId: groupId},
        })
        .then((result) => {
          if (!result) {
            const errMsg = this.locMsg['GROUP_NOT_VALID'][this.lang];
            throw new HttpErrors.UnprocessableEntity(errMsg);
          }
        });
    }
    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
