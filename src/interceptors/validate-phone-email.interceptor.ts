import {
  bind,
  inject,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/context';
import { service } from '@loopback/core';
import { HttpErrors, Request, RestBindings } from '@loopback/rest';
import _ from 'lodash';
import { LocMsgsBindings } from '../keys';
import { EmailService, PhoneNumberService } from '../services';
import { LocalizedMessages } from '../types';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({ tags: { key: ValidatePhoneEmailInterceptor.BINDING_KEY } })
export class ValidatePhoneEmailInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidatePhoneEmailInterceptor.name}`;

  constructor(
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @service(EmailService) public emailService: EmailService,
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
  async intercept(invocationCtx: InvocationContext, next: () => ValueOrPromise<InvocationResult>) {
    const lang = _.includes(this.req.headers['accept-language'], 'en') ? 'en' : 'fa';

    const invalidPhoneValueMessage = this.locMsg['PHONE_NOT_VALID'][lang];
    const invalidEmailValueMessage = this.locMsg['EMAIL_NOT_VALID'][lang];

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
        const phoneValue = invocationCtx.args[0].phone;

        if (!this.phoneNumberService.isValid(phoneValue)) {
          throw new HttpErrors.UnprocessableEntity(invalidPhoneValueMessage);
        }

        invocationCtx.args[0].phone = this.phoneNumberService.convertToE164Format(phoneValue);
      }

      if (invocationCtx.args[0].email) {
        const emailValue = invocationCtx.args[0].email;

        if (!(await this.emailService.isValid(emailValue))) {
          throw new HttpErrors.UnprocessableEntity(invalidEmailValueMessage);
        }

        if (
          invocationCtx.args[0].loginStrategy === 'google' &&
          !this.emailService.isGmail(emailValue)
        ) {
          throw new HttpErrors.UnprocessableEntity(invalidEmailValueMessage);
        }

        invocationCtx.args[0].email = this.emailService.normalize(emailValue);
      }
    }

    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
