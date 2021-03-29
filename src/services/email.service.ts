/* eslint-disable @typescript-eslint/naming-convention */
import { BindingScope, inject, injectable } from '@loopback/core';
import EmailValidator from 'deep-email-validator';
import Axios from 'axios';
import { EmailBindings } from '../keys';

export interface MailOptions {
  subject: string;
  content: string;
  toAddress: string;
  encoding?: 'UTF-8';
  mailFormat?: 'plaintext' | 'html';
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
  constructor(
    @inject(EmailBindings.GMAIL_ACCOUNT) private gmailAccount: string,
    @inject(EmailBindings.ZOHO_ACCOUNT_SCOPE_URL) private accountURL: string,
    @inject(EmailBindings.NOREPLY_MAIL_ADDRESS) private noreplyEmail: string,
    @inject(EmailBindings.SUPPORT_CLIENT_ID) private supportClientId: string,
    @inject(EmailBindings.SUPPORT_EMAIL_ADDRESS) private supportEmail: string,
    @inject(EmailBindings.SUPPORT_MESSAGE_URL) private supportMessageURL: string,
    @inject(EmailBindings.SUPPORT_REFRESH_TOKEN) private supportRefreshToken: string,
    @inject(EmailBindings.SUPPORT_CLIENT_SECRET) private supportClientSecret: string,
  ) {}

  private async refreshSupportAccessToken(): Promise<string> {
    const queryParam = {
      grant_type: 'refresh_token',
      client_id: this.supportClientId,
      refresh_token: this.supportRefreshToken,
      client_secret: this.supportClientSecret,
    };

    try {
      const res = await Axios({
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

    const res = await Axios({
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
        await EmailValidator({
          email: email,
          validateTypo: false,
          validateSMTP: false,
          validateRegex: true,
          validateDisposable: true,
          validateMx: true,
        })
      ).valid
    );
  }

  /** To lowercase and remove dots from gmail addresses
   *
   * @param {String} email
   * @returns String
   */
  public normalize(email: string): string {
    email = email.toLowerCase().replace(/ /g, '');

    const splitted = email.split('@');

    if (splitted.length !== 2) throw new Error('Email value is not valid');

    if (this.isGmail(email)) {
      email = splitted[0].replace(/\./g, '') + '@' + splitted[1];
    }

    return email;
  }

  /**
   * isGmail
   * @param {String} emailValue
   * @returns Boolean
   */
  public isGmail(emailValue: string) {
    emailValue = emailValue.toLowerCase().trim();
    const splitted = emailValue.split('@');

    if (splitted.length !== 2) return false;

    if (splitted[1].startsWith('gmail.')) return true;

    return false;
  }
}
