/* eslint-disable @typescript-eslint/no-explicit-any */
import { BindingScope, injectable } from '@loopback/core';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

@injectable({ scope: BindingScope.SINGLETON })
export class WoocommerceService {
  protected wcRestApi: WooCommerceRestApi;

  constructor() {
    this.wcRestApi = new WooCommerceRestApi({
      url: 'https://www.dongip.ir',
      consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY!,
      consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET!,
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
