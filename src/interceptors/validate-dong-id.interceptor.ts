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
import { Dongs } from '../models';
import { DongsRepository } from '../repositories';
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
      const methodName = invocationCtx.methodName,
        userId = +this.currentUserProfile[securityId],
        lang = _.includes(this.req.headers['accept-language'], 'en') ? 'en' : 'fa',
        dongId = +invocationCtx.args[0];

      if (methodName === 'updateDongsById') {
        const selfUserRelId = +this.currentUserProfile.selfUserRelId,
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
          const billUserRelIds = _.map(billList, b => b.userRelId);

          const payerList = foundDong.payerList;
          const payerUserRelIds = _.map(payerList, p => p.userRelId);

          if (
            billUserRelIds.length !== 1 ||
            payerUserRelIds.length !== 1 ||
            selfUserRelId !== billUserRelIds[0] ||
            selfUserRelId !== payerUserRelIds[0]
          ) {
            throw new HttpErrors.UnprocessableEntity(
              this.locMsg['UPDATE_JUST_SELF_DONG_PONG'][lang],
            );
          }
        }
      } else if (invocationCtx.targetClass.name === 'DongsReceiptsController') {
        const foundDong = await this.dongRepo.count({ dongId: dongId, userId: userId });

        if (!foundDong.count) {
          throw new HttpErrors.UnprocessableEntity(this.locMsg['DONG_NOT_VALID'][lang]);
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
