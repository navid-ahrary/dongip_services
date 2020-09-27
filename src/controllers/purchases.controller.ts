import {repository} from '@loopback/repository';
import {
  param,
  HttpErrors,
  getModelSchemaRef,
  post,
  api,
  RequestContext,
} from '@loopback/rest';
import {service, inject} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';

import moment from 'moment';
import isemail from 'isemail';

import {PurchasesRepository, UsersRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {
  CafebazaarService,
  SubscriptionService,
  FirebaseService,
  MessagePayload,
  WoocommerceService,
  PhoneNumberService,
} from '../services';
import {Purchases, Subscriptions, Users} from '../models';
import {SubscriptionSpec, LocalizedMessages} from '../application';

@api({basePath: '/'})
export class PurchasesController {
  constructor(
    @repository(PurchasesRepository) public purchasesRepo: PurchasesRepository,
    @repository(UsersRepository) public usersRepo: UsersRepository,
    @service(SubscriptionService) protected subsService: SubscriptionService,
    @service(CafebazaarService) protected cafebazaarService: CafebazaarService,
    @service(FirebaseService) protected firebaseService: FirebaseService,
    @service(WoocommerceService) protected woocomService: WoocommerceService,
    @service(PhoneNumberService) protected phoneNumSerice: PhoneNumberService,
    @inject('application.subscriptionSpec') public subsSpec: SubscriptionSpec,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
  ) {}

  async sendNotification(
    userId: typeof Users.prototype.userId,
    subscription: Subscriptions,
  ) {
    const user = await this.usersRepo.findById(userId, {
      fields: {firebaseToken: true, userId: true, setting: true},
      include: [{relation: 'setting'}],
    });

    const lang = user.setting.language;
    const planId = subscription.planId;

    const createdNotify = await this.usersRepo.notifications(userId).create({
      userId: userId,
      type: 'subscription',
      title: this.locMsg['PLAN_ID'][lang][planId],
      body: this.locMsg['SUBSCRIPTION_NOTIFY_BODY'][lang],
    });

    const notifyPayload: MessagePayload = {
      notification: {
        title: createdNotify.title,
        body: createdNotify.body,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
      data: {
        notifyId: createdNotify.getId().toString(),
        type: createdNotify.type,
        title: createdNotify.title,
        body: createdNotify.body,
        subscriptionId: subscription.getId().toString(),
        solTime: subscription.solTime.toString(),
        eolTime: subscription.eolTime.toString(),
      },
    };

    await this.firebaseService.sendToDeviceMessage(
      user.firebaseToken!,
      notifyPayload,
    );
  }

  @authenticate('jwt.access')
  @post('/purchases/in-app/validate/', {
    summary: 'Validate in-app subscription purchase',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      200: {
        description: 'Purchase model instance',
        content: {'application/json': {schema: getModelSchemaRef(Purchases)}},
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
        oneMonth: {value: 'plan_gm1'},
        sixMonths: {value: 'plan_gm6'},
        oneYear: {value: 'plan_gy1'},
      },
    })
    planId: string,
    @param.query.string('purchaseOrigin', {
      description: 'Purchase origin',
      required: true,
      schema: {enum: ['cafebazaar']},
      examples: {cafebazaar: {value: 'cafebazaar'}},
    })
    purchaseOrigin: string,
    @param.query.string('purchaseToken', {
      description: 'Purchase token',
      required: true,
      example: 'AbCd_eFgHiJ',
    })
    purchaseToken: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @inject.context() ctx: RequestContext,
  ): Promise<Purchases> {
    const userId = +currentUserProfile[securityId];
    const lang = ctx.request.headers['accept-language']
      ? ctx.request.headers['accept-language']
      : 'fa';

    let purchaseTime: moment.Moment;

    if (purchaseOrigin === 'cafebazaar') {
      const purchaseStatus = await this.cafebazaarService.getPurchaseState({
        productId: planId,
        purchaseToken: purchaseToken,
      });

      if (
        (purchaseStatus.error === 'not_found' &&
          purchaseStatus.error_description ===
            'The requested purchase is not found!') ||
        (purchaseStatus.error === 'invalid_value' &&
          purchaseStatus.error_description === 'Product is not found.')
      ) {
        const errMsg = this.locMsg['CAFEBAZAAR_PURCHASE_NOT_VALID'][lang];

        console.error(`userId ${userId} ${errMsg}`);
        throw new HttpErrors.UnprocessableEntity(errMsg);
      } else if (purchaseStatus.purchaseState === 0) {
        purchaseTime = moment(purchaseStatus.purchaseTime).utc();

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.subsService
          .performSubscription(userId, planId, purchaseTime)
          .then(async (subs) => {
            await this.sendNotification(userId, subs);
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
  @post('/purchases/in-site/validate/', {
    summary: 'Validate in-site subscription purchase',
    responses: {
      204: {description: 'no content'},
      422: {description: 'Purchase is not valid'},
    },
  })
  async vaildateInsitePurchase(
    @param.query.string('orderId', {
      description: 'Woocommerce order id',
      required: true,
      schema: {type: 'number'},
      example: 468,
    })
    orderId: number,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.woocomService.getOrder(orderId).then(async (order) => {
      if (order['status'] === 'processing') {
        const planId = order['line_items'][0]['sku'];
        const purchaseAmount = +order['line_items'][0]['price'];
        const currency = order['currency'];
        const purchaseToken = order['order_key'];
        const purchasedAt = moment(order['date_paid_gmt']);
        const purchaseOrigin = order['payment_method'];

        let identiyValue = order['billing']['phone'];
        let user: Users | null;

        const isMobile = this.phoneNumSerice.isValid(identiyValue);
        const isEmail = isemail.validate(identiyValue);

        if (isMobile) {
          identiyValue = this.phoneNumSerice.convertToE164Format(identiyValue);

          user = await this.usersRepo.findOne({
            where: {phone: identiyValue},
          });
        } else if (isEmail) {
          identiyValue = this.phoneNumSerice.convertToE164Format(identiyValue);

          user = await this.usersRepo.findOne({
            where: {email: identiyValue},
          });
        } else if (identiyValue.startsWith('0')) {
          identiyValue = this.phoneNumSerice.normalizeZeroPrefix(identiyValue);

          user = await this.usersRepo.findOne({
            where: {phone: identiyValue},
          });
        } else {
          throw new Error(
            `${order['billing']['phone']} is not a valid phone or email address`,
          );
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
              await this.sendNotification(user!.getId(), subs);

              await this.woocomService.updateOrderStatus(orderId, 'completed');
            });
        }
      }
    });
  }
}
