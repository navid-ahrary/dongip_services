import {
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';

import _ from 'lodash';

@bind({tags: {key: PhoneOrEmailInterceptor.BINDING_KEY}})
export class PhoneOrEmailInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${PhoneOrEmailInterceptor.name}`;

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
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let reqBody: any;

      if (
        invocationCtx.methodName === 'verify' ||
        invocationCtx.methodName === 'createUsersRels'
      ) {
        reqBody = invocationCtx.args[0];

        if (
          (!_.has(reqBody, 'phone') && !_.has(reqBody, 'email')) ||
          (_.has(reqBody, 'phone') && _.has(reqBody, 'email'))
        ) {
          throw new Error('Either Phone or email must be provided');
        }
      } else if (invocationCtx.methodName === 'patchUsersRelsById') {
        if (
          (!_.has(reqBody, 'phone') && !_.has(reqBody, 'email')) ||
          (_.has(reqBody, 'phone') && _.has(reqBody, 'email'))
        ) {
          throw new Error('Either Phone or email must be provided');
        }
        reqBody = invocationCtx.args[1];
      }

      // Add pre-invocation logic here
      const result = await next();
      // Add post-invocation logic here
      return result;
    } catch (err) {
      // Add error handling logic here
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }
}
