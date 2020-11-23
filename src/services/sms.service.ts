/* eslint-disable @typescript-eslint/no-explicit-any */
import { BindingScope, injectable, service } from '@loopback/core';
import { repository } from '@loopback/repository';

const Kavenegar = require('kavenegar');

import { VerifyRepository } from '../repositories';
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

  constructor(
    @service(PhoneNumberService) private phoneNumService: PhoneNumberService,
    @repository(VerifyRepository) public verifyRepository: VerifyRepository,
    private smsApi = Kavenegar.KavenegarApi({
      apikey: process.env.KAVENEGAR_API,
    }),
  ) {
    this.validateEnvVars();
  }

  private validateEnvVars() {
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
      this.smsApi.VerifyLookup(sms, (res: any, status: number) => {
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
