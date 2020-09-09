import {repository, DataObject} from '@loopback/repository';
import {api, param, get, HttpErrors, getModelSchemaRef} from '@loopback/rest';
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
} from '../services';
import {Purchases, Subscriptions, Users} from '../models';
import {SubscriptionSpec} from '../application';

@api({basePath: '/purchases'})
@authenticate('jwt.access')
export class PurchasesController {
  readonly userId: number;

  constructor(
    @repository(PurchasesRepository) public purchasesRepo: PurchasesRepository,
    @repository(UsersRepository) public usersRepo: UsersRepository,
    @service(SubscriptionService) protected subsService: SubscriptionService,
    @service(CafebazaarService) protected cafebazaarService: CafebazaarService,
    @service(FirebaseService) protected firebaseService: FirebaseService,
    @inject('application.subscriptionSpec') public subsSpec: SubscriptionSpec,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {
    this.userId = +this.currentUserProfile[securityId];
  }

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
        solTime: subscription.solTime,
        eolTime: subscription.eolTime,
      },
    };

    await this.firebaseService.sendToDeviceMessage(
      user.firebaseToken,
      notifyPayload,
    );
  }

  @get('/validate', {
    summary: 'Validate subscription purchase',
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
  async validatePurchases(
    @param.query.string('planId', {
      description: 'planId/productId/sku',
      required: true,
      schema: {
        enum: ['plan_gm1', 'plan_gm6', 'plan_gy1'],
      },
      examples: {
        'Golden plan monthly, 1 month': {value: 'plan_gm1'},
        'Golden plan monthly, 6 months': {value: 'plan_gm6'},
        'Golden plan yearly, 1 year': {value: 'plan_gy1'},
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
      example: 'VRFS0nyW_ZLP_7SU',
    })
    purchaseToken: string,
  ): Promise<Purchases> {
    let purchaseTime: string;

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

        console.error(
          `userId ${this.userId} ${errMsg}: ${JSON.stringify(purchaseStatus)}`,
        );

        throw new HttpErrors.UnprocessableEntity(errMsg);
      } else if (purchaseStatus.purchaseState === 0) {
        purchaseTime = moment(purchaseStatus.purchaseTime).utc().toISOString();

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.subsService
          .performSubscription(this.userId, planId, purchaseTime)
          .then(async (subs) => {
            await this.sendNotification(this.userId, subs);
          });

        const purchaseEnt: DataObject<Purchases> = {
          userId: this.userId,
          planId: planId,
          purchasedAt: purchaseTime,
          purchaseToken: purchaseToken,
        };

        return this.purchasesRepo.create(purchaseEnt);
      } else {
        const errMsg =
          'متاسفانه خرید انجام شده از سمت کافه‌بازار برگشت خورده‌است. ' +
          'هزینه پرداخت شده حداکثر تا ۲۴ ساعت آینده به حسابتان واریز می‌شود' +
          'جهت رفع هرگونه ابهام یا مغایرت، با پشتیبانی دُنگیپ تماس بگیرید';

        console.error(
          `userId ${this.userId} ${errMsg}: ${JSON.stringify(purchaseStatus)}`,
        );

        throw new HttpErrors.UnprocessableEntity(errMsg);
      }
    } else {
      const errMsg = 'Purchase origin not supported';

      console.error(`userId ${this.userId}: ${errMsg}`);

      throw new HttpErrors.NotImplemented(errMsg);
    }
  }
}
