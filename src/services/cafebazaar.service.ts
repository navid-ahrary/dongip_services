/* eslint-disable @typescript-eslint/naming-convention */
import { BindingScope, inject, injectable } from '@loopback/core';
import axios from 'axios';
import qs from 'qs';
import { CafebazaarBindings } from '../keys';

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
  constructor(
    @inject(CafebazaarBindings.CAFEBAZAAR_API_BASEURL) private apiBaseUrl: string,
    @inject(CafebazaarBindings.CAFEBAZAAR_CLIENT_ID) private clientId: string,
    @inject(CafebazaarBindings.CAFEBAZAAR_CLIENT_SECRET) private clientSecret: string,
    @inject(CafebazaarBindings.CAFEBAZAAR_PACKAGE_NAME) private packageName: string,
    @inject(CafebazaarBindings.CAFEBAZAAR_REFRESH_TOKEN) private refreshToken: string,
  ) {}

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
        url: this.apiBaseUrl + apiPath,
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
        url: this.apiBaseUrl + apiPath,
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
