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
import {UsersRelsRepository, UsersRepository} from '../repositories';
import {HttpErrors} from '@loopback/rest';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidateUsersRelsInterceptor.BINDING_KEY}})
export class ValidateUsersRelsInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateUsersRelsInterceptor.name}`;
  readonly userId: number;

  constructor(
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
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
    if (invocationCtx.methodName === 'createGroups') {
      const userRelIds = invocationCtx.args[0].userRelIds;
      // eslint-disable-next-line prefer-const
      let userRelIdsFilter: {userRelId: number}[] = [];

      userRelIds.forEach((id: number) => {
        userRelIdsFilter.push({userRelId: id});
      });

      const countUserRels = await this.usersRelsRepository.count({
        userId: this.userId,
        or: userRelIdsFilter,
      });

      if (countUserRels.count !== userRelIds.length) {
        throw new HttpErrors.UnprocessableEntity('آی دی دوستی ها معتبر نیستن');
      }
    } else if (invocationCtx.methodName === 'patchGroupsById') {
      if (invocationCtx.args[1].userRelIds) {
        const userRelIds = invocationCtx.args[1].userRelIds;
        // eslint-disable-next-line prefer-const
        let userRelIdsFilter: {userRelId: number}[] = [];

        userRelIds.forEach((id: number) => {
          userRelIdsFilter.push({userRelId: id});
        });

        const countUserRels = await this.usersRelsRepository.count({
          userId: this.userId,
          or: userRelIdsFilter,
        });

        if (countUserRels.count !== userRelIds.length) {
          throw new HttpErrors.UnprocessableEntity(
            'آی دی دوستی ها معتبر نیستن!',
          );
        }
      }
    } else if (
      invocationCtx.methodName === 'findUsersRelsBudgets' ||
      invocationCtx.methodName === 'createUsersRelsBudgets'
    ) {
      const userRelId = invocationCtx.args[0];

      const foundUserRel = await this.usersRelsRepository.findOne({
        where: {userRelId: userRelId, userId: this.userId},
      });

      if (!foundUserRel) {
        throw new HttpErrors.UnprocessableEntity('آی دی دسته بندی معتبر نیست');
      }
    }

    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
