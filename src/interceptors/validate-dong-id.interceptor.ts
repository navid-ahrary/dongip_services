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
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { repository } from '@loopback/repository';
import { HttpErrors, RestBindings, Request } from '@loopback/rest';
import _ from 'lodash';
import { DongsRepository } from '../repositories';
import { Dongs } from '../models';
import { LocMsgsBindings } from '../keys';
import { LocalizedMessages } from '../types';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@injectable({ tags: { key: ValidateDongIdInterceptor.BINDING_KEY } })
export class ValidateDongIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateDongIdInterceptor.name}`;

  constructor(
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @repository(DongsRepository) public dongRepo: DongsRepository,
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
    try {
      if (invocationCtx.methodName === 'updateDongsById') {
        const userId = +this.currentUserProfile[securityId],
          selfUserRelId = +this.currentUserProfile.selfUserRelId,
          lang = _.includes(this.req.headers['accept-language'], 'en') ? 'en' : 'fa',
          dongId = +invocationCtx.args[0],
          patchDong: Dongs = invocationCtx.args[1];

        const foundDong = await this.dongRepo.findOne({
          fields: { userId: true, dongId: true },
          where: { dongId: dongId, userId: userId },
          include: [
            {
              relation: 'billList',
              scope: { fields: { userId: true, dongId: true, userRelId: true } },
            },
            {
              relation: 'payerList',
              scope: { fields: { userId: true, dongId: true, userRelId: true } },
            },
          ],
        });

        if (!foundDong) {
          throw new HttpErrors.UnprocessableEntity(this.locMsg['DONG_NOT_VALID'][lang]);
        }

        if (_.has(patchDong, 'pong')) {
          const billList = foundDong.billList;
          const billUserRelIds = _.map(billList, (b) => b.userRelId);

          const payerList = foundDong.payerList;
          const payerUserRelIds = _.map(payerList, (p) => p.userRelId);

          if (
            billUserRelIds.length !== 1 ||
            payerUserRelIds.length !== 1 ||
            selfUserRelId !== billUserRelIds[0] ||
            selfUserRelId !== payerUserRelIds[0]
          ) {
            throw new HttpErrors.UnprocessableEntity(
              this.locMsg['UPDATE_NOT_SELF_DONG_PONG'][lang],
            );
          }
        }
      }
      const result = await next();
      // Add post-invocation logic here
      return result;
    } catch (err) {
      // Add error handling logic here
      throw err;
    }
  }
}
