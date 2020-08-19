import {
  /* inject, */
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
  service,
} from '@loopback/core';
import {SubscriptionService} from '../services';
import {HttpErrors} from '@loopback/rest';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidateSubscriptionPlanstInterceptor.BINDING_KEY}})
export class ValidateSubscriptionPlanstInterceptor
  implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateSubscriptionPlanstInterceptor.name}`;

  constructor(
    @service(SubscriptionService) private subsService: SubscriptionService,
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
    try {
      if (invocationCtx.methodName === 'getGatewayUrl') {
        const plan = invocationCtx.args[0].plan;
        this.subsService.validatePlan(plan);
      }

      if (invocationCtx.methodName === 'verifyTransaction') {
        const provider = invocationCtx.args[0];
        this.subsService.validateProvider(provider);
      }

      const result = await next();
      // Add post-invocation logic here
      return result;
    } catch (err) {
      // Add error handling logic here
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }
}
