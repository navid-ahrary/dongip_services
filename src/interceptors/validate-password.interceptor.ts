import {
  /* inject, */
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidatePasswordInterceptor.BINDING_KEY}})
export class ValidatePasswordInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidatePasswordInterceptor.name}`;

  /*
  constructor() {}
  */

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
    if (
      invocationCtx.methodName === 'login' ||
      invocationCtx.methodName === 'signup'
    ) {
      const invalidPassword = 'طول رمز ۹ کاراکتر نیست!';

      if (
        invocationCtx.args[0].password.length !== 9 ||
        typeof invocationCtx.args[0].password !== 'string'
      ) {
        throw new HttpErrors.UnprocessableEntity(invalidPassword);
      }
    }
    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
