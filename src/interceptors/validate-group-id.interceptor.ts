import {
  /* inject, */
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
import {GroupsRepository} from '../repositories';
import {HttpErrors} from '@loopback/rest';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidateGroupIdInterceptor.BINDING_KEY}})
export class ValidateGroupIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateGroupIdInterceptor.name}`;
  readonly userId: number;

  constructor(
    @repository(GroupsRepository)
    public groupsRepository: GroupsRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
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
    if (invocationCtx.methodName === 'createDongs') {
      if (invocationCtx.args[0].groupId) {
        const groupId = invocationCtx.args[0].groupId;

        await this.groupsRepository
          .findOne({
            where: {userId: this.userId, groupId: groupId},
          })
          .then((result) => {
            if (!result)
              throw new HttpErrors.UnprocessableEntity('آی دی گروه معتبر نیست');
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
          if (!result)
            throw new HttpErrors.UnprocessableEntity('آی دی گروه معتبر نیست');
        });
    }
    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
