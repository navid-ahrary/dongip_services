import {
  /* inject, */
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/context';
import AwesomePhoneNumber from 'awesome-phonenumber';
import {HttpErrors} from '@loopback/rest';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidatePhoneNumInterceptor.BINDING_KEY}})
export class ValidatePhoneNumInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidatePhoneNumInterceptor.name}`;

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
    // Add pre-invocation logic here
    const invalidPhoneValueMessage = 'شماره موبایل وارد شده معتبر نیست!',
      invalidRegionMessage =
        'در حال حاضر تنها شماره موبایل ایران قابل قبول است!';

    let phoneValue: string, pn: AwesomePhoneNumber;

    // Validate phone number value in expected methods below
    if (
      invocationCtx.methodName === 'verify' ||
      invocationCtx.methodName === 'login' ||
      invocationCtx.methodName === 'singup'
    ) {
      phoneValue = invocationCtx.args[0].phone;
      pn = new AwesomePhoneNumber(phoneValue);

      if (!pn.isMobile()) {
        throw new HttpErrors.UnprocessableEntity(invalidPhoneValueMessage);
      }

      if (pn.getRegionCode() !== 'IR') {
        throw new HttpErrors.UnprocessableEntity(invalidRegionMessage);
      }

      // Convert phone value to e.164 format
      phoneValue = pn.getNumber('e164');
      invocationCtx.args[0].phone = phoneValue;
    } else if (
      invocationCtx.methodName === 'createUserRel' ||
      invocationCtx.methodName === 'patchUserRel'
    ) {
      // This check is for "patchUserRel" method
      // beacuse reqeust body may not includes a phone value
      if (invocationCtx.args[0].phone) {
        phoneValue = invocationCtx.args[0].phone;
        pn = new AwesomePhoneNumber(phoneValue);

        if (!pn.isMobile()) {
          throw new HttpErrors.UnprocessableEntity(invalidPhoneValueMessage);
        }

        // Convert phone value to e.164 format
        phoneValue = pn.getNumber('e164');
        invocationCtx.args[0].phone = phoneValue;
      }
    }
    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
