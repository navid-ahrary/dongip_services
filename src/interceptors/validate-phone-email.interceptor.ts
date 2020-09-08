import {
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/context';
import {HttpErrors} from '@loopback/rest';
import {service} from '@loopback/core';

import isemail from 'isemail';

import {PhoneNumberService} from '../services';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidatePhoneEmailInterceptor.BINDING_KEY}})
export class ValidatePhoneEmailInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidatePhoneEmailInterceptor.name}`;

  constructor(
    @service(PhoneNumberService) public phoneNumberService: PhoneNumberService,
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
    const invalidPhoneValueMessage = 'شماره موبایل وارد شده معتبر نیست!';
    const invalidEmailValueMessage = 'آدرس ایمیل وارد شده معتبر نیست!';

    const funcNameList = [
      'verify',
      'login',
      'signup',
      'createUsersRels',
      'patchUsersRels',
    ];

    if (funcNameList.includes(invocationCtx.methodName)) {
      if (invocationCtx.args[0].phone) {
        let phoneValue = invocationCtx.args[0].phone;

        const isValid = this.phoneNumberService.isValid(phoneValue);
        if (!isValid) {
          throw new HttpErrors.UnprocessableEntity(invalidPhoneValueMessage);
        }

        phoneValue = this.phoneNumberService.convertToE164Format(phoneValue);
        invocationCtx.args[0].phone = phoneValue;
      } else if (invocationCtx.args[0].email) {
        const emailValue = invocationCtx.args[0].email;

        const isValid = isemail.validate(emailValue);
        if (!isValid) {
          throw new HttpErrors.UnprocessableEntity(invalidEmailValueMessage);
        }
      }
    }

    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
