import {
  globalInterceptor,
  inject,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import { repository } from '@loopback/repository';
import { RequestContext } from '@loopback/rest';
import { UserProfile, SecurityBindings, securityId } from '@loopback/security';
import _ from 'lodash';
import { UsersRepository } from '../repositories';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@globalInterceptor('FirebaseToken', { tags: { name: 'firebaseToken' } })
export class FirebaseTokenInterceptor implements Provider<Interceptor> {
  constructor(
    @inject.context() public ctx: RequestContext,
    @repository(UsersRepository) private usersRepo: UsersRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
  ) {}

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
    const headers = this.ctx.request.headers,
      userId = +this.currentUserProfile[securityId];

    if (_.isString(headers['firebase-token'])) {
      const firebaseToken = headers['firebase-token'];

      await this.usersRepo.updateAll(
        { firebaseToken: firebaseToken },
        { userId: userId, firebaseToken: { inq: [undefined, 'null'] } },
      );
    }
    // Add pre-invocation logic here
    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
