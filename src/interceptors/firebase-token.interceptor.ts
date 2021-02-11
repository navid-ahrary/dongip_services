import {
  inject,
  injectable,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import { repository } from '@loopback/repository';
import { RestBindings } from '@loopback/rest';
import { UserProfile, SecurityBindings, securityId } from '@loopback/security';
import { UsersRepository } from '../repositories';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@injectable({ tags: { key: FirebaseTokenInterceptor.BINDING_KEY } })
export class FirebaseTokenInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${FirebaseTokenInterceptor.name}`;
  constructor(
    @repository(UsersRepository) private usersRepo: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
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
    const userId = +this.currentUserProfile[securityId],
      httpReq = await invocationCtx.get(RestBindings.Http.REQUEST),
      token = httpReq.headers['firebase-token'];

    if (typeof token === 'string') {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepo.updateAll(
        { firebaseToken: token },
        { userId: userId, firebaseToken: { inq: [undefined, 'null'] } },
      );
    }
    // Add pre-invocation logic here
    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
