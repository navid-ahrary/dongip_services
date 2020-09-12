/* eslint-disable @typescript-eslint/no-explicit-any */
import {bind, BindingScope} from '@loopback/core';

import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

const websiteURL = 'https://www.dongip.ir';
const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

@bind({scope: BindingScope.SINGLETON})
export class WoocommerceService {
  constructor(
    protected wcRestApi = new WooCommerceRestApi({
      url: websiteURL,
      consumerKey: consumerKey!,
      consumerSecret: consumerSecret!,
      version: 'wc/v3',
    }),
  ) {}

  async getOrder(orderKey: number): Promise<{[key: string]: any}> {
    const res = await this.wcRestApi.get(`orders/${orderKey}`);
    return res.data;
  }

  async updateOrderStatus(orderKey: number, status: string): Promise<any> {
    return this.wcRestApi.put(`orders/${orderKey}`, {status: status});
  }
}
