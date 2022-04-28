/* eslint-disable @typescript-eslint/naming-convention */
import { BindingScope, inject, injectable } from '@loopback/core';
import { LoggingBindings, WinstonLogger } from '@loopback/logging';
import axios from 'axios';
import EmailValidator from 'deep-email-validator';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { EmailBindings, LocMsgsBindings } from '../keys';
import { LocalizedMessages } from '../types';

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
    @inject(LocMsgsBindings) private locMsg: LocalizedMessages,
    @inject(EmailBindings.GMAIL_ACCOUNT) private gmailAccount: string,
    @inject(LoggingBindings.WINSTON_LOGGER) private logger: WinstonLogger,
    @inject(EmailBindings.ZOHO_ACCOUNT_SCOPE_URL) private accountURL: string,
    @inject(EmailBindings.NOREPLY_MAIL_ADDRESS) private noreplyEmail: string,
    @inject(EmailBindings.SUPPORT_CLIENT_ID) private supportClientId: string,
    @inject(EmailBindings.SUPPORT_EMAIL_ADDRESS) private supportEmail: string,
    @inject(EmailBindings.SUPPORT_MESSAGE_URL) private supportMessageURL: string,
    @inject(EmailBindings.SUPPORT_REFRESH_TOKEN) private supportRefreshToken: string,
    @inject(EmailBindings.SUPPORT_CLIENT_SECRET) private supportClientSecret: string,
  ) {}

  private async getAccessToken(): Promise<string> {
    const queryParam = {
      grant_type: 'refresh_token',
      client_id: this.supportClientId,
      refresh_token: this.supportRefreshToken,
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

  async sendSupportMail(
    receiptorAddress: string,
    code: string,
    contentLanguage: string,
  ): Promise<SentEmail> {
    let mailContent = fs.readFileSync(
      path.resolve(__dirname, '../../assets/confirmation_dongip_en.html'),
      'utf-8',
    );

    mailContent = util.format(mailContent, code);

    const accessToken = await this.getAccessToken();

    try {
      const res = await axios.post(
        this.supportMessageURL,
        {
          encoding: 'UTF-8',
          fromAddress: `Dongip<${this.supportEmail}>`,
          subject: this.locMsg['VERFIY_EMAIL_SUBJECT'][contentLanguage],
          toAddress: receiptorAddress,
          mailFormat: 'html',
          content: mailContent,
        },
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        },
      );

      return res.data;
    } catch (err) {
      this.logger.log('error', JSON.stringify(err));
      if (err.message === 'read ECONNRESET') {
        return await this.sendSupportMail(receiptorAddress, code, contentLanguage);
      } else {
        throw new Error(err);
      }
    }
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
    email = email.toLowerCase().trim();

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
