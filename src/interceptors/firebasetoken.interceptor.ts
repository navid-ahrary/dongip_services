import {
  inject,
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {repository} from '@loopback/repository';
import {UserProfile, SecurityBindings, securityId} from '@loopback/security';
import {UsersRepository} from '../repositories';
import {RestBindings} from '@loopback/rest';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: FirebasetokenInterceptor.BINDING_KEY}})
export class FirebasetokenInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${FirebasetokenInterceptor.name}`;

  constructor(
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
  async intercept(
    invocationCtx: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ) {
    const httpReq = await invocationCtx.get(RestBindings.Http.REQUEST, {
        optional: true,
      }),
      userId = Number(this.currentUserProfile[securityId]);

    if (httpReq && httpReq!.headers['firebase-token']) {
      const firebaseToken = httpReq.headers['firebase-token'];

      if (typeof firebaseToken === 'string') {
        await this.usersRepo.updateById(userId, {
          firebaseToken: firebaseToken,
        });
      }
    }
    // Add pre-invocation logic here
    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
