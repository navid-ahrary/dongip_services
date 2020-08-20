import {bind, BindingScope, inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {UsersRepository, CheckoutsRepository} from '../repositories';
import {config} from 'dotenv';
import {SubscriptionSpecsInterface} from '../application';

config();

const ZarinpalCheckout = require('zarinpal-checkout');
const merchantId = process.env.MERCHANT_ID;

export interface Gateway {
  status?: number;
  authority: number;
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
    try {
      this.validatePlan(plan);

      return await new Promise((resolve, reject) => {
        const planAmount = +this.getCheckoutAmount(plan);
        const callbackUrl =
          process.env.BASE_URL + '/subscription/verify-transaction/zarinpal';

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
                authority: this.castString(response.authority),
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
    } catch (error) {
      console.error(error);
      throw new Error(error.message);
    }
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
    try {
      return await new Promise((resolve, reject) => {
        this.zarinpal
          .PaymentVerification({
            Amount: amount.toString(),
            Authority: authority,
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((response: any) => {
            if (response.status !== 100) {
              console.error(response);
              reject({status: +response.status, RefID: +response.RefID});
            } else {
              resolve({status: +response.status, RefID: +response.RefID});
            }
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .catch((err: any) => {
            console.error(err);
            reject(err);
          });
      });
    } catch (error) {
      console.error(error);
      throw new Error(error.message);
    }
  }

  /** Get checkout amount
   *
   * @param plan string
   * @returns {price}
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
    const validProviderList = subscriptionFile.prividers;

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
