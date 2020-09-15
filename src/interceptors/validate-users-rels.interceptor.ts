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
    let errMsg: string;

    try {
      if (invocationCtx.methodName === 'createGroups') {
        const userRelIds = invocationCtx.args[0].userRelIds;

        const countUserRels = await this.usersRelsRepository.count({
          userId: this.userId,
          userRelId: {inq: userRelIds},
        });

        if (countUserRels.count !== userRelIds.length) {
          errMsg = 'آی دی دوستی ها معتبر نیستن';

          throw new Error(errMsg);
        }
      } else if (invocationCtx.methodName === 'patchGroupsById') {
        if (invocationCtx.args[1].userRelIds) {
          const userRelIds = invocationCtx.args[1].userRelIds;

          const countUserRels = await this.usersRelsRepository.count({
            userId: this.userId,
            userRelId: {inq: userRelIds},
          });

          if (countUserRels.count !== userRelIds.length) {
            errMsg = 'آی دی دوستی ها معتبر نیستن';

            throw new Error(errMsg);
          }
        }
      } else if (
        invocationCtx.methodName === 'patchUsersRelsById' ||
        invocationCtx.methodName === 'deleteUsersRelsById'
      ) {
        const userRelId = invocationCtx.args[0];

        const foundUserRel = await this.usersRelsRepository.findOne({
          where: {
            userRelId: userRelId,
            userId: this.userId,
            type: {neq: 'self'},
          },
        });

        if (!foundUserRel) {
          errMsg = 'آی دی دوستی معتبر نیست';

          throw new Error(errMsg);
        }
      } else if (invocationCtx.methodName === 'createUsersRels') {
        if (!invocationCtx.args[0].phone) {
          errMsg = 'Phone number must b provided';

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
