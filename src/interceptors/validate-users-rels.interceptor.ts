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
import {HttpErrors, RequestContext} from '@loopback/rest';
import {LocalizedMessages} from '../application';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidateUsersRelsInterceptor.BINDING_KEY}})
export class ValidateUsersRelsInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateUsersRelsInterceptor.name}`;
  private readonly userId: number;
  lang: string;

  constructor(
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @inject.context() public ctx: RequestContext,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.lang = this.ctx.request.headers['accept-language']
      ? this.ctx.request.headers['accept-language']
      : 'fa';
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
          errMsg = this.locMsg['SOME_USERS_RELS_NOT_VALID'][this.lang];

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
            errMsg = this.locMsg['SOME_USERS_RELS_NOT_VALID'][this.lang];

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
          errMsg = this.locMsg['USER_REL_NOT_VALID'][this.lang];

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
