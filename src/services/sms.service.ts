/* eslint-disable @typescript-eslint/no-explicit-any */
import { BindingScope, inject, injectable, service } from '@loopback/core';
import { KavenegarBindings } from '../keys';
import { PhoneNumberService } from './phone-number.service';

const Kavenegar = require('kavenegar');

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

  constructor(
    @service(PhoneNumberService) private phoneNumService: PhoneNumberService,
    @inject(KavenegarBindings.KAVENEGAR_API_KEY) private apiKey: string,
    @inject(KavenegarBindings.SMS_TEMPLATE_EN) private tempEn: string,
    @inject(KavenegarBindings.SMS_TEMPLATE_FA) private tempFa: string,
    @inject(KavenegarBindings.SMS_SURVEY_TEMPLATE) private surveyTemp: string,
  ) {
    this.kavenegarApi = Kavenegar.KavenegarApi({ apikey: this.apiKey });
  }

  public async sendSms(data: {
    token1: string;
    receptor: string;
    lang: string;
    type: 'verify' | 'survey';
    token2?: string;
  }): Promise<KavenegarResponse> {
    data.receptor = this.phoneNumService.formatForSendSMSFromIran(data.receptor);

    let template = '';
    if (data.type === 'verify') {
      template = data.lang === 'fa' ? this.tempFa : this.tempEn;
    } else if (data.type === 'survey') {
      template = this.surveyTemp;
    }

    const sms: VerifyLookupSMS = {
      token: data.token1,
      token2: data.token2,
      template: template,
      type: this.LOOKUP_TYPE,
      receptor: data.receptor,
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
