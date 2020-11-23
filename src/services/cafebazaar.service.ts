/* eslint-disable @typescript-eslint/naming-convention */
import { BindingScope, injectable } from '@loopback/core';
import axios from 'axios';
import qs from 'qs';

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: 'androidpublisher';
}

export interface ValidPurchaseResponse {
  consumptionState?: number;
  purchaseState?: number;
  kind?: string;
  developerPayload?: string;
  purchaseTime?: number;
  error?: 'not_found' | 'invalid_value';
  error_description?: 'The requested purchase is not found!' | 'Product is not found.';
}

export interface Purchase {
  productId: string;
  purchaseToken: string;
}

@injectable({ scope: BindingScope.TRANSIENT })
export class CafebazaarService {
  private readonly packageName = process.env.CAFEBAZAAR_PACKAGE_NAME;
  private readonly refreshToken = process.env.CAFEBAZAAR_REFRESH_TOKEN;
  private readonly clientId = process.env.CAFEBAZAAR_CLIENT_ID;
  private readonly clientSecret = process.env.CAFEBAZAAR_CLIENT_SECRET;
  private readonly baseURL = process.env.CAFEBAZAAR_API_BASEURL;

  constructor() {}

  private async getAccessToken(): Promise<AccessTokenResponse> {
    const payload = qs.stringify({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
    });

    try {
      const apiPath = '/auth/token/';
      const result = await axios({
        method: 'POST',
        url: this.baseURL + apiPath,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: payload,
      });

      const data = result.data;
      return data;
    } catch (err) {
      throw new Error(err);
    }
  }

  public async getPurchaseState(args: Purchase): Promise<ValidPurchaseResponse> {
    try {
      const data = await this.getAccessToken();

      const apiPath =
        `/api/validate/${this.packageName}` +
        `/inapp/${args.productId}/purchases/${args.purchaseToken}/`;

      const result = await axios({
        method: 'GET',
        headers: { Authorization: data.access_token },
        url: this.baseURL + apiPath,
      });

      return result.data;
    } catch (err) {
      if (err.response.status === 404) {
        return err.response.data;
      } else {
        throw new Error(err.message);
      }
    }
  }
}
