/* eslint-disable @typescript-eslint/no-explicit-any */
import { BindingScope, injectable, service } from '@loopback/core';
const Kavenegar = require('kavenegar');

import { PhoneNumberService } from './phone-number.service';

const faTemplate = process.env.SMS_TEMPLATE_FA!;
const enTemplate = process.env.SMS_TEMPLATE_EN!;

export interface VerifyLookupSMS {
  token: string;
  token2: string | undefined;
  template: string;
  type: string;
  receptor: string;
}

export interface KavenegarResponse {
  statusCode: number;
  body: {
    messageid: number;
    message: string;
    status: number;
    statustext: string;
    sender: string;
    receptor: string;
    date: number;
    cost: number;
  };
}

@injectable({ scope: BindingScope.SINGLETON })
export class SmsService {
  private readonly LOOKUP_TYPE = 'sms';
  private readonly kavenegarApi;

  constructor(@service(PhoneNumberService) private phoneNumService: PhoneNumberService) {
    this.kavenegarApi = Kavenegar.KavenegarApi({ apikey: process.env.KAVENEGAR_API });
    this._validateEnvVars();
  }

  private _validateEnvVars() {
    if (!process.env.SMS_TEMPLATE_FA || !process.env.SMS_TEMPLATE_EN) {
      throw new Error('SMS template is not provided');
    }

    if (!process.env.KAVENEGAR_API) {
      throw new Error('KAVENEGAR API is not provided');
    }
  }

  public async sendSms(
    token1: string,
    receptor: string,
    lang: string,
    token2?: string,
  ): Promise<KavenegarResponse> {
    receptor = this.phoneNumService.formatForSendSMSFromIran(receptor);

    const sms: VerifyLookupSMS = {
      token: token1,
      token2: token2 ? token2 : undefined,
      template: lang === 'fa' ? faTemplate : enTemplate,
      type: this.LOOKUP_TYPE,
      receptor: receptor,
    };

    return new Promise((resolve, reject) => {
      this.kavenegarApi.VerifyLookup(sms, (res: any, status: number) => {
        if (status && res) {
          resolve({
            statusCode: status,
            body: res.length ? res[0] : res, // Handle object and array type
          });
        } else
          reject({
            statusCode: status,
            message: 'Not got acceptable response from SMS provider',
          });
      });
    });
  }
}
