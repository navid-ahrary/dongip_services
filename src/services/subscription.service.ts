import {bind, BindingScope, inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {UsersRepository, CheckoutsRepository} from '../repositories';
import {config} from 'dotenv';
import {SubscriptionSpecsInterface} from '../application';

config();

const ZarinpalCheckout = require('zarinpal-checkout');
const merchantId = process.env.MERCHANT_ID;

export interface Gateway {
  authority: string;
  url: string;
}

export interface VerifyTransaction {
  status: number;
  RefID: number;
}

const subscriptionFile: SubscriptionSpecsInterface = require('../../subscription-specs.json');

@bind({scope: BindingScope.SINGLETON})
export class SubscriptionService {
  constructor(
    @repository(UsersRepository) public usersRepo: UsersRepository,
    @repository(CheckoutsRepository) public checksRepo: CheckoutsRepository,
    private zarinpal = ZarinpalCheckout.create(merchantId, false),
  ) {}

  /** Get checkout's gateway url
   *
   * @param plan string
   * @param phone string
   */
  async getGatewayUrl(plan: string, phone: string): Promise<Gateway> {
    const planAmount = +this.getCheckoutAmount(plan);
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
  getCheckoutAmount(plan: string): number {
    try {
      this.validatePlan(plan);

      if (subscriptionFile.plans[plan].onSale) {
        return subscriptionFile.plans[plan].sale;
      } else return subscriptionFile.plans[plan].price;
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

      return subscriptionFile.plans[plan].description['fa'];
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
    const plansTitle = Object.keys(subscriptionFile.plans);

    if (!plansTitle.includes(plan)) {
      const errMsg = 'Plan is not valid!';
      console.error(errMsg);
      throw new Error(errMsg);
    }

    return;
  }

  validateProvider(provider: string): void {
    const validProviderList = subscriptionFile.gatewayProviders;

    if (!validProviderList.includes(provider)) {
      const errMsg = 'Provider is not valid';
      console.error(errMsg);
      throw new Error(errMsg);
    }

    return;
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
