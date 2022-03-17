/* eslint-disable @typescript-eslint/no-explicit-any */
import { BindingScope, inject, injectable } from '@loopback/core';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { WoocommerceBindings } from '../keys';

@injectable({ scope: BindingScope.SINGLETON })
export class WoocommerceService {
  protected readonly wcRestApi: WooCommerceRestApi;

  constructor(
    @inject(WoocommerceBindings.WOOCOMMERCE_ADDRESS) woocommerceAddress: string,
    @inject(WoocommerceBindings.WOOCOMMERCE_CONSUMER_KEY) consumerKey: string,
    @inject(WoocommerceBindings.WOOCOMMERCE_CONSUMER_SECRET) consumerSecret: string,
  ) {
    this.wcRestApi = new WooCommerceRestApi({
      url: woocommerceAddress,
      consumerKey: consumerKey,
      consumerSecret: consumerSecret,
      version: 'wc/v3',
    });
  }

  async getOrder(orderId: number): Promise<{ [key: string]: any }> {
    try {
      const res = await this.wcRestApi.get(`orders/${orderId}`);
      return res.data;
    } catch (err) {
      throw new Error(err);
    }
  }

  async updateOrderStatus(orderId: number, status: string): Promise<any> {
    try {
      const result = await this.wcRestApi.put(`orders/${orderId}`, { status: status });
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }
}
