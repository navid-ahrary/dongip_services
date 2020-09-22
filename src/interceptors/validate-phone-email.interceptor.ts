import {
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
  inject,
} from '@loopback/context';
import {HttpErrors, RequestContext} from '@loopback/rest';
import {service} from '@loopback/core';

import isemail from 'isemail';
import dotenv from 'dotenv';
dotenv.config();

import {PhoneNumberService} from '../services';
import {LocalizedMessages} from '../application';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidatePhoneEmailInterceptor.BINDING_KEY}})
export class ValidatePhoneEmailInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidatePhoneEmailInterceptor.name}`;
  lang: string;

  constructor(
    @service(PhoneNumberService) public phoneNumberService: PhoneNumberService,
    @inject.context() public ctx: RequestContext,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
  ) {
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
    const invalidPhoneValueMessage = this.locMsg['PHONE_NOT_VALID'][this.lang];
    const invalidEmailValueMessage = this.locMsg['EMAIL_NOT_VALID'][this.lang];

    const funcNameList = [
      'verify',
      'login',
      'signup',
      'updateUserById',
      'createUsersRels',
      'updateUsersRelsById',
      'completeSignup',
    ];

    if (funcNameList.includes(invocationCtx.methodName)) {
      if (invocationCtx.args[0].phone) {
        let phoneValue = invocationCtx.args[0].phone;

        if (phoneValue) {
          const isValid = this.phoneNumberService.isValid(phoneValue);
          if (!isValid) {
            throw new HttpErrors.UnprocessableEntity(invalidPhoneValueMessage);
          }

          phoneValue = this.phoneNumberService.convertToE164Format(phoneValue);
          invocationCtx.args[0].phone = phoneValue;
        }
      } else if (invocationCtx.args[0].email) {
        const emailValue = invocationCtx.args[0].email;
        const dongipMailAddress = process.env.GMAIL_USER;

        const isValid = isemail.validate(emailValue);
        if (!isValid || emailValue === dongipMailAddress) {
          throw new HttpErrors.UnprocessableEntity(invalidEmailValueMessage);
        }
      }
    }

    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
