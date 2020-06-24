import {
  inject,
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {HttpErrors} from '@loopback/rest';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidateUserIdInterceptor.BINDING_KEY}})
export class ValidateUserIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateUserIdInterceptor.name}`;
  userId: number;

  constructor(
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
    const userIdInPath = invocationCtx.args[0];

    if (userIdInPath !== this.userId) {
      throw new HttpErrors.UnprocessableEntity('userId با توکن همخونی نداره');
    }
    // Add pre-invocation logic here
    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
