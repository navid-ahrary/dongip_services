/* eslint-disable @typescript-eslint/naming-convention */
import { BindingScope, injectable } from '@loopback/core';
import emailValidator from 'deep-email-validator';
import util from 'util';
import axios from 'axios';

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
  gmailAccount = process.env.GMAIL_ACCOUNT;
  supportEmail = process.env.ZOHO_SUPPORT_MAIL_ADDRESS;
  supportRefreshToken = process.env.ZOHO_SUPPRT_ACCOUNT_REFRESH_TOKEN;
  supportClientId = process.env.ZOHO_SUPPORT_ACCOUNT_CLIENT_ID;
  supportClientSecret = process.env.ZOHO_SUPPORT_ACCOUNT_CLIENT_SECRET;
  supportMessageURL = util.format(
    process.env.ZOHO_MESSAGE_SCOPE_URL,
    process.env.ZOHO_SUPPORT_ACCOUNT_ID,
  );
  noreplyEmail = process.env.ZOHO_NOREPLY_MAIL_ADDRESS;
  accountURL = process.env.ZOHO_ACCOUNT_SCOPE_URL;

  constructor() {}

  private async refreshSupportAccessToken(): Promise<string> {
    const queryParam = {
      grant_type: 'refresh_token',
      refresh_token: this.supportRefreshToken,
      client_id: this.supportClientId,
      client_secret: this.supportClientSecret,
    };

    try {
      const res = await axios({
        method: 'POST',
        url: this.accountURL,
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
      url: this.supportMessageURL,
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      data: {
        encoding: 'UTF-8',
        fromAddress: `Dongip<${this.supportEmail}>`,
        ...mailOptions,
      },
    });

    return res.data;
  }

  async isValid(email: string): Promise<boolean> {
    return (
      email !== this.supportEmail &&
      email !== this.gmailAccount &&
      email !== this.noreplyEmail &&
      (
        await emailValidator({
          email: email,
          validateSMTP: false,
          validateTypo: false,
        })
      ).valid
    );
  }

  /** To lowercase and remove dots from gmail addresses
   *
   * @param email string
   * @returns string
   */
  normalize(email: string): string {
    let result = email.toLowerCase();

    const splitted = result.split('@');

    if (splitted.length !== 2) throw new Error('Email value is not valid');

    if (splitted[1].startsWith('gmail.')) {
      result = splitted[0].replace(/\./g, '') + '@' + splitted[1];
    }

    return result;
  }
}
