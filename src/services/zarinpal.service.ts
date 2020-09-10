import {bind, BindingScope} from '@loopback/core';

import dotenv from 'dotenv';
dotenv.config();

const Zarinpal = require('zarinpal-checkout');

const MERCHAT_ID = process.env.ZARINPAL_MERCHANT_ID;

export interface Verification {
  Amount: string;
  Authority: string;
}

@bind({scope: BindingScope.SINGLETON})
export class ZarinpalService {
  constructor(protected zarinpal = Zarinpal.create(MERCHAT_ID, false)) {}

  async verifyPurchase(verficationObject: Verification) {
    return new Promise((resolve, reject) => {
      this.zarinpal
        .PaymentVerification(verficationObject)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((response: any) => {
          console.log(response);

          if (response.status !== 100) {
            console.log('Empty!');
          } else {
            resolve(response);
          }
        })
        .catch((err: Error) => {
          console.error(err);
          reject(err);
        });
    });
  }
}
