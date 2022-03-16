/* eslint-disable no-useless-catch */
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
import { HttpErrors, Request, RestBindings } from '@loopback/rest';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import _ from 'lodash';
import { LocMsgsBindings } from '../keys';
import { AccountsRepository } from '../repositories';
import { LocalizedMessages } from '../types';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@injectable({ tags: { key: ValidateAccountIdInterceptor.BINDING_KEY } })
export class ValidateAccountIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateAccountIdInterceptor.name}`;
  private readonly userId: number;

  constructor(
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @inject(LocMsgsBindings) private locMsg: LocalizedMessages,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @repository(AccountsRepository) private accountRepo: AccountsRepository,
  ) {
    this.userId = +this.currentUserProfile[securityId];
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
  async intercept(invocationCtx: InvocationContext, next: () => ValueOrPromise<InvocationResult>) {
    try {
      const lang = _.includes(this.req.headers['accept-language'], 'en') ? 'en' : 'fa';
      const errMsg = this.locMsg['ACCOUNT_NOT_VALID'][lang];

      if (invocationCtx.methodName === 'createDongs' && invocationCtx.args[0].accountIds) {
        const accountId = invocationCtx.args[0].accountId;

        const countAccount = await this.accountRepo.count({
          userId: this.userId,
          accountId: accountId,
        });
        // Validate categoryId
        if (countAccount.count !== 1) {
          throw new HttpErrors.UnprocessableEntity(errMsg);
        }
      }
      // Add pre-invocation logic here
      const result = await next();
      // Add post-invocation logic here
      return result;
    } catch (err) {
      // Add error handling logic here
      throw err;
    }
  }
}
