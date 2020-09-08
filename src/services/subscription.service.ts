import {bind, BindingScope, inject} from '@loopback/core';
import {repository} from '@loopback/repository';
<<<<<<< Updated upstream
import {UsersRepository} from '../repositories';

import {config} from 'dotenv';
import moment from 'moment';

import {Users} from '../models';
=======
>>>>>>> Stashed changes

import dotenv from 'dotenv';
dotenv.config();

const ZarinpalCheckout = require('zarinpal-checkout');
const merchantId = process.env.MERCHANT_ID;

import {UsersRepository, CheckoutsRepository} from '../repositories';
import {SubscriptionSpec} from '../application';

export interface Gateway {
  authority: string;
  url: string;
}

export interface VerifyTransaction {
  status: number;
  RefID: number;
}

/**
 * Subscription specs from subscriotion-scpecs.json
 */
export interface SubscriptionSpecsInterface {
  gatewayProviders: string[];
  baseCallbackUrl: string;
  plans: {
    [key: string]: {
      id: string;
      name: string;
      grade: string;
      duration: {
        unit: string;
        amount: number;
      };
      regular: {[key: string]: number};
      sale: {[key: string]: number};
      onSale: boolean;
      description: {[key: string]: string};
    };
  };
}

const subscriptionFile: SubscriptionSpecsInterface = require('../../subscription-specs.json');

@bind({scope: BindingScope.SINGLETON})
export class SubscriptionService {
  constructor(
    @repository(UsersRepository) public usersRepo: UsersRepository,
    @repository(CheckoutsRepository) public checksRepo: CheckoutsRepository,
    @inject('application.subscriptionSpec') private subsSpec: SubscriptionSpec,
    private zarinpal = ZarinpalCheckout.create(merchantId, false),
  ) {}

  async getSubscriptionStatus(userId: typeof Users.prototype.userId) {}

  /** Perform subsciption on user
   *
   * @param userId number
   * @param planId string
   *
   * @returns {Promise} string
   */
  async performSubscription(
    userId: typeof Users.prototype.userId,
    planId: string,
  ) {
    try {
      const planDuration = this.getPlanDuration(planId);

      const solTimeUTCISO = moment.utc().toISOString();
      const eolTimeUTCISO = moment.utc().add(planDuration, 's').toISOString();

      await this.usersRepo
        .updateById(userId, {
          roles: ['GOLD'],
          startOfLife: solTimeUTCISO,
          endOfLife: eolTimeUTCISO,
        })
        .then(() => {
          return {endOfLife: eolTimeUTCISO};
        });
    } catch (error) {
      throw new Error(`Perform subscription error: ${error}`);
    }
  }

  /** Get checkout's gateway url
   *
   * @param plan string
   * @param phone string
   */
  async getGatewayUrl(plan: string, phone: string): Promise<Gateway> {
    const planAmount = +this.getCheckoutAmountTomans(plan);

    const callbackUrl =
      process.env.BASE_URL + '/subscriptions/verify-transactions/zarinpal';

    return new Promise((resolve, reject) => {
      this.zarinpal
        .PaymentRequest({
          Amount: planAmount.toString(),
          Description: this.getDescription(plan),
          CallbackURL: callbackUrl,
          Mobile: phone,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((response: any) => {
          if (response.status === 100) {
            resolve({
              authority: response.authority,
              url: response.url,
            });
          }
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .catch((err: any) => {
          console.error(err);
          reject(err);
        });
    });
  }

  /** Verfiy Zarinpal transaction
   *
   * @param status string
   * @param autrhority string
   */
  async verifyZarinpalTransaction(
    authority: string,
    amount: number,
  ): Promise<VerifyTransaction> {
    return new Promise((resolve, reject) => {
      this.zarinpal
        .PaymentVerification({
          Amount: amount.toString(),
          Authority: authority,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((response: any) => {
          resolve({status: +response.status, RefID: +response.RefID});
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .catch((err: any) => {
          reject(err);
        });
    });
  }

  /** Get checkout amount
   *
   * @param plan string
   * @returns number
   */
  getCheckoutAmountTomans(plan: string): number {
    try {
      this.validatePlan(plan);

      return this.subsSpec.plans[plan].onSale
        ? this.subsSpec.plans[plan].sale['tomans']
        : this.subsSpec.plans[plan].regular['tomans'];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /** Get checkout description
   *
   * @param plan string
   * @returns string
   */
  getDescription(plan: string): string {
    try {
      this.validatePlan(plan);

      return this.subsSpec.plans[plan].description['fa'];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /** Validate plan
   *
   * @param plan string
   * @void
   */
  validatePlan(plan: string): void {
    const plansTitle = Object.keys(this.subsSpec.plans);

    if (!plansTitle.includes(plan)) {
      const errMsg = 'Plan is not valid!';
      console.error(errMsg);
      throw new Error(errMsg);
    }

    return;
  }

  validateProvider(provider: string): void {
    const validProviderList = this.subsSpec.gatewayProviders;

    if (!validProviderList.includes(provider)) {
      const errMsg = 'Provider is not valid';
      console.error(errMsg);
      throw new Error(errMsg);
    }

    return;
  }

  getPlanIdsList(): string[] {
    return Object.keys(this.subsSpec.plans);
  }

  /**
   *
   * @param planId string
   * @returns number
   */
  getPlanDuration(planId: string) {
    const plans = subscriptionFile.plans;

    for (const p in plans) {
      if (plans[p].id === planId) return +plans[p].duration.amount;
      else continue;
    }
  }

  /**
   *
   * @param value string
   * @returns number
   */
  castString(authority: string): number {
    return parseInt(String(authority.match(/\d+$/)), 10);
  }

  /** Convert Tomans to Rials
   *
   * @param value number
   * @returns number
   */
  convertTomansToRials(value: number): number {
    return +(String(value) + '0');
  }

  /** Convert Rials to Tomans
   *
   * @param value number
   * @returns number
   */
  convertRialsToTomans(value: number): number {
    return +String(value).slice(0, -1);
  }
}
