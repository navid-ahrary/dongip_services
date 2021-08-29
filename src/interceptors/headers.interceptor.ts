import {
  inject,
  injectable,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import { DataObject, repository } from '@loopback/repository';
import { RestBindings } from '@loopback/rest';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import _ from 'lodash';
import { Users } from '../models';
import { UsersRepository } from '../repositories';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@injectable({ tags: { key: HeadersInterceptor.BINDING_KEY } })
export class HeadersInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${HeadersInterceptor.name}`;
  constructor(
    @repository(UsersRepository) private usersRepo: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile & DataObject<Users>,
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
    const userId = +this.currentUserProfile[securityId],
      httpReq = await invocationCtx.get(RestBindings.Http.REQUEST),
      reportedFirebaseToken = this.currentUserProfile.firebaseToken,
      desiredFirebaseToken = httpReq.headers['firebase-token']?.toString(),
      reportedUserAgent = this.currentUserProfile.userAgent,
      desiredUserAgent = httpReq.headers['user-agent']?.toString(),
      reportedAppVersion = this.currentUserProfile.appVersion,
      desiredAppVersion = httpReq.headers['app-version']?.toString(),
      reportedPaltform = this.currentUserProfile.platform,
      desiredPlatform = httpReq.headers['platform']?.toString(),
      marketplace = httpReq.headers['marketplace']?.toString();

    const patchBody: Partial<DataObject<Users>> = {};

    if (
      desiredFirebaseToken &&
      desiredFirebaseToken !== 'null' &&
      desiredFirebaseToken !== reportedFirebaseToken
    ) {
      patchBody.firebaseToken = desiredFirebaseToken;
    }

    if (desiredUserAgent && desiredUserAgent !== 'null' && desiredUserAgent !== reportedUserAgent) {
      patchBody.userAgent = desiredUserAgent;
    }

    if (
      desiredAppVersion &&
      desiredAppVersion !== 'null' &&
      desiredAppVersion !== reportedAppVersion
    ) {
      patchBody.appVersion = desiredAppVersion;
    }

    if (desiredPlatform && desiredPlatform !== reportedPaltform) {
      patchBody.platform = desiredPlatform;
    }

    if (marketplace) {
      patchBody.marketplace = marketplace;
    }

    if (_.keys(patchBody).length) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepo.updateById(userId, patchBody);
    }
    // Add pre-invocation logic here
    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
