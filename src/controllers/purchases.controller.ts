/* eslint-disable @typescript-eslint/naming-convention */
import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { inject, intercept, service } from '@loopback/core';
import { repository } from '@loopback/repository';
import {
  getModelSchemaRef,
  HttpErrors,
  param,
  post,
  requestBody,
  RequestContext,
} from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import _ from 'lodash';
import moment from 'moment';
import { ValidatePhoneEmailInterceptor } from '../interceptors';
import { LocMsgsBindings, SubsSpecBindings } from '../keys';
import { InappPurchase, Purchases, Subscriptions, Users } from '../models';
import { PurchasesRepository, UsersRepository } from '../repositories';
import {
  CafebazaarService,
  CurrentUserProfile,
  EmailService,
  FirebaseService,
  PhoneNumberService,
  SubscriptionService,
  WoocommerceService,
} from '../services';
import { LocalizedMessages, SubscriptionSpec } from '../types';

export class PurchasesController {
  constructor(
    @inject.context() private ctx: RequestContext,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(SubsSpecBindings) public subsSpec: SubscriptionSpec,
    @repository(UsersRepository) public usersRepo: UsersRepository,
    @repository(PurchasesRepository) public purchasesRepo: PurchasesRepository,
    @service(EmailService) public emailService: EmailService,
    @service(FirebaseService) public firebaseService: FirebaseService,
    @service(SubscriptionService) public subsService: SubscriptionService,
    @service(WoocommerceService) public woocomService: WoocommerceService,
    @service(PhoneNumberService) public phoneNumSerice: PhoneNumberService,
    @service(CafebazaarService) public cafebazaarService: CafebazaarService,
  ) {}

  @authenticate('jwt.access')
  @post('/purchases/in-app', {
    summary: 'Report in-app subscription purchase',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      201: {
        description: 'Subscription model',
        content: {
          'application/json': { schema: getModelSchemaRef(Subscriptions) },
        },
      },
      409: {
        description: 'Error: Duplicate purchaseToken',
      },
    },
  })
  async getInappPurchase(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(InappPurchase),
          example: {
            planId: 'plan_gm1',
            purchaseToken: 'VRFS0nyW_ZLP_7SU',
            purchaseUnixTime: 1595967742659,
            purchaseOrigin: 'cafebazaar',
          },
        },
      },
    })
    inappPurchBody: InappPurchase,
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
  ): Promise<Subscriptions | null> {
    const userId = +currentUserProfile[securityId];
    const lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';

    const purchaseUTCTime =
      inappPurchBody.purchaseUnixTime / 10 ** 10 > 0
        ? moment(inappPurchBody.purchaseUnixTime)
        : moment.unix(inappPurchBody.purchaseUnixTime);
    const purchaseToken = inappPurchBody.purchaseToken;
    const purchaseOrigin = inappPurchBody.purchaseOrigin;
    const planId = inappPurchBody.planId;

    try {
      const purchaseEnt = new Purchases({
        userId: userId,
        planId: planId,
        purchaseToken: purchaseToken,
        purchaseOrigin: purchaseOrigin,
        purchasedAt: purchaseUTCTime.toISOString(),
      });

      await this.purchasesRepo.create(purchaseEnt);
    } catch (err) {
      if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
        console.error(err.sqlMessage);
        throw new HttpErrors.Conflict(this.locMsg['CAFEBAZAAR_PURCHASE_DUPLICATION'][lang]);
      }
    }
    const subs = await this.subsService.performSubscription(userId, planId, purchaseUTCTime);

    await this.subsService.sendNotification(userId, subs);

    return subs;
  }

  @authenticate.skip()
  @intercept(ValidatePhoneEmailInterceptor.BINDING_KEY)
  @post('/purchases/in-site/validate/', {
    summary: 'Validate in-site subscription purchase',
    responses: {
      204: { description: 'no content' },
      422: { description: 'Purchase is not valid' },
    },
  })
  async vaildateInsitePurchase(
    @param.query.string('orderId', {
      description: 'Woocommerce order id',
      required: true,
      schema: { type: 'number' },
      example: 468,
    })
    orderId: number,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.woocomService.getOrder(orderId).then(async order => {
      if (order['status'] === 'processing') {
        const planId = order['line_items'][0]['sku'],
          purchaseAmount = +order['line_items'][0]['price'],
          currency = order['currency'],
          purchaseToken = order['order_key'],
          purchasedAt = moment(order['date_paid_gmt']),
          purchaseOrigin = order['payment_method'];

        let identityValue = order['billing']['phone'],
          user: Users | null;

        const isMobile = this.phoneNumSerice.isValid(identityValue),
          isEmail = await this.emailService.isValid(identityValue);

        if (isMobile) {
          user = await this.usersRepo.findOne({
            where: { phone: identityValue },
          });
        } else if (isEmail) {
          identityValue = this.emailService.normalize(identityValue);

          user = await this.usersRepo.findOne({
            where: { email: identityValue },
          });
        } else if (identityValue.startsWith('0')) {
          identityValue = this.phoneNumSerice.normalizeZeroPrefix(identityValue);

          user = await this.usersRepo.findOne({
            where: { phone: identityValue },
          });
        } else {
          throw new Error(`${order['billing']['phone']} is not a valid phone or email address`);
        }

        if (user) {
          await this.purchasesRepo.create({
            userId: user.getId(),
            planId: planId,
            purchaseAmount: purchaseAmount,
            currency: currency,
            purchaseToken: purchaseToken,
            purchasedAt: purchasedAt.toISOString(),
            purchaseOrigin: purchaseOrigin,
          });

          await this.subsService
            .performSubscription(user.getId(), planId, purchasedAt)
            .then(async subs => {
              await this.subsService.sendNotification(user!.getId(), subs);

              await this.woocomService.updateOrderStatus(orderId, 'completed');
            });
        }
      }
    });
  }
}
