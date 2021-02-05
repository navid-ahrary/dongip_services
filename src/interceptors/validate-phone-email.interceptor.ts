import {
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
  inject,
} from '@loopback/context';
import { HttpErrors, RestBindings, Request } from '@loopback/rest';
import { service } from '@loopback/core';
import _ from 'lodash';
import { EmailService, PhoneNumberService } from '../services';
import { LocalizedMessages } from '../application';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({ tags: { key: ValidatePhoneEmailInterceptor.BINDING_KEY } })
export class ValidatePhoneEmailInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidatePhoneEmailInterceptor.name}`;

  constructor(
    @service(PhoneNumberService) public phoneNumberService: PhoneNumberService,
    @service(EmailService) public emailService: EmailService,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
    @inject(RestBindings.Http.REQUEST) private req: Request,
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

        invocationCtx.args[0].email = this.emailService.normalize(emailValue);
      }
    }

    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
