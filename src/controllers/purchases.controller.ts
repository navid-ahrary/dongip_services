import { repository } from '@loopback/repository';
import {
  param,
  HttpErrors,
  getModelSchemaRef,
  post,
  RequestContext,
  requestBody,
} from '@loopback/rest';
import { service, inject, intercept } from '@loopback/core';
import { SecurityBindings, securityId } from '@loopback/security';
import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import _ from 'lodash';
import Moment from 'moment';
import { PurchasesRepository, UsersRepository } from '../repositories';
import {
  CafebazaarService,
  SubscriptionService,
  FirebaseService,
  WoocommerceService,
  PhoneNumberService,
  EmailService,
  CurrentUserProfile,
} from '../services';
import { Purchases, Subscriptions, Users, InappPurchase } from '../models';
import { ValidatePhoneEmailInterceptor } from '../interceptors';
import { LocMsgsBindings, SubsSpecBindings } from '../keys';
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
        ? Moment(inappPurchBody.purchaseUnixTime)
        : Moment.unix(inappPurchBody.purchaseUnixTime);
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

    return this.subsService.performSubscription(userId, planId, purchaseUTCTime);
  }

  @authenticate('jwt.access')
  @post('/purchases/in-app/validate/', {
    summary: 'Validate in-app subscription purchase',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      200: {
        description: 'Purchase model instance',
        content: { 'application/json': { schema: getModelSchemaRef(Purchases) } },
      },
      422: {
        description: 'Purchase is not valid',
      },
    },
  })
  async validateInappPurchases(
    @param.query.string('planId', {
      description: 'planId/productId/sku',
      required: true,
      schema: {
        enum: ['plan_gm1', 'plan_gm6', 'plan_gy1'],
      },
      examples: {
        oneMonth: { value: 'plan_gm1' },
        sixMonths: { value: 'plan_gm6' },
        oneYear: { value: 'plan_gy1' },
      },
    })
    planId: string,
    @param.query.string('purchaseOrigin', {
      description: 'Purchase origin',
      required: true,
      schema: { enum: ['cafebazaar'] },
      examples: { cafebazaar: { value: 'cafebazaar' } },
    })
    purchaseOrigin: string,
    @param.query.string('purchaseToken', {
      description: 'Purchase token',
      required: true,
      example: 'AbCd_eFgHiJ',
    })
    purchaseToken: string,
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
  ): Promise<Purchases> {
    const userId = +currentUserProfile[securityId];
    const lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';

    let purchaseTime: moment.Moment;

    if (purchaseOrigin === 'cafebazaar') {
      const purchaseStatus = await this.cafebazaarService.getPurchaseState({
        productId: planId,
        purchaseToken: purchaseToken,
      });

      if (
        (purchaseStatus.error === 'not_found' &&
          purchaseStatus.error_description === 'The requested purchase is not found!') ||
        (purchaseStatus.error === 'invalid_value' &&
          purchaseStatus.error_description === 'Product is not found.')
      ) {
        const errMsg = this.locMsg['CAFEBAZAAR_PURCHASE_NOT_VALID'][lang];

        console.error(`userId ${userId} ${errMsg}`);
        throw new HttpErrors.UnprocessableEntity(errMsg);
      } else if (purchaseStatus.purchaseState === 0) {
        purchaseTime = Moment(purchaseStatus.purchaseTime).utc();

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.subsService.performSubscription(userId, planId, purchaseTime).then(async (subs) => {
          await this.subsService.sendNotification(userId, subs);
        });

        const purchaseEnt = new Purchases({
          userId: userId,
          planId: planId,
          purchasedAt: purchaseTime.toISOString(),
          purchaseToken: purchaseToken,
          purchaseOrigin: purchaseOrigin,
        });

        return this.purchasesRepo.create(purchaseEnt);
      } else {
        const errMsg = this.locMsg['CAFEBAZAAR_PURCHASE_DROPED'][lang];

        console.error(`userId ${userId} ${errMsg}`);
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }
    } else {
      const errMsg = 'Purchase origin is not supported';

      console.error(`userId ${userId}: ${errMsg}`);
      throw new HttpErrors.NotImplemented(errMsg);
    }
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
    this.woocomService.getOrder(orderId).then(async (order) => {
      if (order['status'] === 'processing') {
        const planId = order['line_items'][0]['sku'],
          purchaseAmount = +order['line_items'][0]['price'],
          currency = order['currency'],
          purchaseToken = order['order_key'],
          purchasedAt = Moment(order['date_paid_gmt']),
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
            .then(async (subs) => {
              await this.subsService.sendNotification(user!.getId(), subs);

              await this.woocomService.updateOrderStatus(orderId, 'completed');
            });
        }
      }
    });
  }
}
