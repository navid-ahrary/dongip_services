import {
  inject,
  injectable,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors, RestBindings, Request} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import _ from 'lodash';

import {LocalizedMessages} from '../application';
import {UsersRepository} from '../repositories';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@injectable({tags: {key: ValidateGoldUserInterceptor.BINDING_KEY}})
export class ValidateGoldUserInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateGoldUserInterceptor.name}`;
  private readonly userId: number;

  constructor(
    @repository(UsersRepository) public usersRepo: UsersRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
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
    try {
      if (
        invocationCtx.methodName === 'createDongs' &&
        _.has(invocationCtx.args[0], 'jointAccountId')
      ) {
        const accountType = this.currentUserProfile;
        console.log(accountType);
      }
      const result = await next();
      // Add post-invocation logic here
      return result;
    } catch (err) {
      // Add error handling logic here
      throw new HttpErrors[403](err);
    }
  }
}
