/* eslint-disable @typescript-eslint/naming-convention */
import { BindingScope, injectable } from '@loopback/core';
import isEmail from 'isemail';
import util from 'util';
import axios from 'axios';

const gmailAccount = process.env.GMAIL_ACCOUNT;
const supportEmail = process.env.ZOHO_SUPPORT_MAIL_ADDRESS;
const supportRefreshToken = process.env.ZOHO_SUPPRT_ACCOUNT_REFRESH_TOKEN;
const supportClientId = process.env.ZOHO_SUPPORT_ACCOUNT_CLIENT_ID;
const supportClientSecret = process.env.ZOHO_SUPPORT_ACCOUNT_CLIENT_SECRET;
const supportAccountId = process.env.ZOHO_SUPPORT_ACCOUNT_ID;
const supportMessageURL = util.format(process.env.ZOHO_MESSAGE_SCOPE_URL, supportAccountId);

const noreplyEmail = process.env.ZOHO_NOREPLY_MAIL_ADDRESS;

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

  isValid(email: string): boolean {
    return (
      isEmail.validate(email) &&
      email !== supportEmail &&
      email !== gmailAccount &&
      email !== noreplyEmail
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
    if (splitted[1].includes('gmail')) {
      result = splitted[0].replace(/\./g, '') + '@' + splitted[1];
    }
    return result;
  }
}
