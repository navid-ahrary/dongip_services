/* eslint-disable @typescript-eslint/no-explicit-any */
import { BindingScope, inject, injectable } from '@loopback/core';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { WoocommerceBindings } from '../keys';

@injectable({ scope: BindingScope.SINGLETON })
export class WoocommerceService {
  protected readonly wcRestApi: WooCommerceRestApi;

  constructor(
    @inject(WoocommerceBindings.WOOCOMMERCE_CONSUMER_KEY) consumerKey: string,
    @inject(WoocommerceBindings.WOOCOMMERCE_CONSUMER_SECRET) consumerSecret: string,
  ) {
    this.wcRestApi = new WooCommerceRestApi({
      url: process.env.SITE_URL!,
      consumerKey: consumerKey,
      consumerSecret: consumerSecret,
      version: 'wc/v3',
    });
  }

  async getOrder(orderId: number): Promise<{ [key: string]: any }> {
    const res = await this.wcRestApi.get(`orders/${orderId}`);
    return res.data;
  }

  async updateOrderStatus(orderId: number, status: string): Promise<any> {
    return this.wcRestApi.put(`orders/${orderId}`, { status: status });
  }
}
