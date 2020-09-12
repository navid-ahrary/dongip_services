/* eslint-disable @typescript-eslint/no-floating-promises */
import {repository} from '@loopback/repository';
import {param, HttpErrors, getModelSchemaRef, post, api} from '@loopback/rest';
import {service, inject} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';

import moment from 'moment';

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
import {SubscriptionSpec} from '../application';

@api({basePath: '/purchases/'})
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
  ) {}

  async sendNotification(
    userId: typeof Users.prototype.userId,
    subscription: Subscriptions,
  ) {
    const createdNotify = await this.usersRepo.notifications(userId).create({
      userId: userId,
      type: 'subscription',
      title: this.subsSpec.plans[subscription.planId].description['fa'],
      body:
        'شما مشترک طلایی دُنگیپ هستید. تمام امکانات اپلیکیشن در اختیار شماست',
    });

    const user = await this.usersRepo.findById(userId, {
      fields: {firebaseToken: true},
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
  @post('/in-app/validate/', {
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
  ): Promise<Purchases> {
    const userId = +currentUserProfile[securityId];

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
        const errMsg =
          'متاسفانه خرید انجام شده به تایید کافه‌بازار نرسید. ' +
          'جهت رفع هرگونه ابهام یا مغایرت، با پشتیبانی دُنگیپ تماس بگیرید';

        console.error(`userId ${userId} ${errMsg}`);
        throw new HttpErrors.UnprocessableEntity(errMsg);
      } else if (purchaseStatus.purchaseState === 0) {
        purchaseTime = moment(purchaseStatus.purchaseTime).utc();

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
        const errMsg =
          'متاسفانه خرید انجام شده از سمت کافه‌بازار برگشت خورده‌است. ' +
          'هزینه پرداخت شده حداکثر تا ۲۴ ساعت آینده به حسابتان واریز می‌شود' +
          'جهت رفع هرگونه ابهام یا مغایرت، با پشتیبانی دُنگیپ تماس بگیرید';

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
  @post('/in-site/validate/', {
    summary: 'Validate in-site subscription purchase',
    responses: {
      200: {},
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
    this.woocomService.getOrder(orderId).then(async (order) => {
      if (order['status'] === 'processing') {
        const phoneOrEmail = this.phoneNumSerice.convertToE164Format(
          order['billing']['phone'],
        );
        const planId = order['line_items'][0]['sku'];
        const purchaseAmount = +order['line_items'][0]['price'];
        const currency = order['currency'];
        const purchaseToken = order['order_key'];
        const purchasedAt = moment(order['date_paid_gmt']);
        const purchaseOrigin = order['payment_method'];

        const user = await this.usersRepo.findOne({
          where: {or: [{phone: phoneOrEmail}, {email: phoneOrEmail}]},
        });

        if (user) {
          this.purchasesRepo.create({
            userId: user.getId(),
            planId: planId,
            purchaseAmount: purchaseAmount,
            currency: currency,
            purchaseToken: purchaseToken,
            purchasedAt: purchasedAt.toISOString(),
            purchaseOrigin: purchaseOrigin,
          });

          this.subsService
            .performSubscription(user.getId(), planId, purchasedAt)
            .then(async (subs) => {
              await this.sendNotification(user.getId(), subs);

              await this.woocomService.updateOrderStatus(orderId, 'completed');
            });
        }
      }
    });
  }
}
