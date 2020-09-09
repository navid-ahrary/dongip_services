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
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
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
    let errMessg: string;

    const methodsList = [
      'findUsersRelsBudgets',
      'createUsersRelsBudgets',
      'patchUsersRelsById',
      'deleteUsersRelsById',
    ];

    try {
      if (invocationCtx.methodName === 'createGroups') {
        const userRelIds = invocationCtx.args[0].userRelIds;

        const countUserRels = await this.usersRelsRepository.count({
          userId: this.userId,
          userRelId: {inq: userRelIds},
        });

        if (countUserRels.count !== userRelIds.length) {
          errMessg = 'آی دی دوستی ها معتبر نیستن';
          throw new Error(errMessg);
        }
      } else if (invocationCtx.methodName === 'patchGroupsById') {
        if (invocationCtx.args[1].userRelIds) {
          const userRelIds = invocationCtx.args[1].userRelIds;

          const countUserRels = await this.usersRelsRepository.count({
            userId: this.userId,
            userRelId: {inq: userRelIds},
          });

          if (countUserRels.count !== userRelIds.length) {
            errMessg = 'آی دی دوستی ها معتبر نیستن';
            throw new Error(errMessg);
          }
        }
      } else if (methodsList.includes(invocationCtx.methodName)) {
        const userRelId = invocationCtx.args[0];

        const foundUserRel = await this.usersRelsRepository.findOne({
          where: {
            userRelId: userRelId,
            userId: this.userId,
            type: {neq: 'self'},
          },
        });

        if (!foundUserRel) {
          errMessg = 'آی دی دوستی معتبر نیست';
          throw new Error(errMessg);
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
