/* eslint-disable @typescript-eslint/naming-convention */
import { BindingScope, injectable } from '@loopback/core';

import util from 'util';
import axios from 'axios';

const supportEmail = process.env.ZOHO_SUPPORT_MAIL_ADDRESS;
const supportRefreshToken = process.env.ZOHO_SUPPRT_ACCOUNT_REFRESH_TOKEN;
const supportClientId = process.env.ZOHO_SUPPORT_ACCOUNT_CLIENT_ID;
const supportClientSecret = process.env.ZOHO_SUPPORT_ACCOUNT_CLIENT_SECRET;
const supportAccountId = process.env.ZOHO_SUPPORT_ACCOUNT_ID;

const supportMessageURL = util.format(process.env.ZOHO_MESSAGE_SCOPE_URL, supportAccountId);
const accountURL = process.env.ZOHO_ACCOUNT_SCOPE_URL;

export interface MailOptions {
  toAddress: string;
  subject: string;
  content: string;
  mailFormat?: 'plaintext' | 'html';
  encoding?: 'UTF-8';
}

export interface SentEmail {
  status: {
    code: number;
    description: string;
  };
  data: {
    messageId: string;
    [key: string]: string;
  };
}

@injectable({ scope: BindingScope.SINGLETON })
export class EmailService {
  constructor() {}

  private async refreshSupportAccessToken(): Promise<string> {
    const queryParam = {
      grant_type: 'refresh_token',
      refresh_token: supportRefreshToken,
      client_id: supportClientId,
      client_secret: supportClientSecret,
    };

    try {
      const res = await axios({
        method: 'POST',
        url: accountURL,
        params: queryParam,
      });

      if (res.status === 200) {
        return res.data['access_token'];
      } else {
        throw new Error(res.statusText);
      }
    } catch (err) {
      throw new Error(err);
    }
  }

  async sendSupportMail(mailOptions: MailOptions): Promise<SentEmail> {
    const accessToken = await this.refreshSupportAccessToken();

    const res = await axios({
      method: 'POST',
      url: supportMessageURL,
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      data: {
        encoding: 'UTF-8',
        fromAddress: `Dongip<${supportEmail}>`,
        ...mailOptions,
      },
    });

    return res.data;
  }
}
