/* eslint-disable @typescript-eslint/no-explicit-any */
import {bind, BindingScope, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {config} from 'dotenv';
config();

const Kavenegar = require('kavenegar');

import {VerifyRepository} from '../repositories';
import {PhoneNumberService} from './phone-number.service';

type VerifyLookupSMS = {
  token: string;
  token2: string | undefined;
  template: string;
  type: string;
  receptor: string;
};

type KavenegarResponse = {
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
};

@bind({scope: BindingScope.SINGLETON})
export class SmsService {
  private readonly SMS_TEMPLATE = process.env.SMS_TEMPLATE;
  private readonly LOOKUP_TYPE = 'sms';

  constructor(
    @repository(VerifyRepository) public verifyRepository: VerifyRepository,
    private smsApi = Kavenegar.KavenegarApi({
      apikey: process.env.KAVENEGAR_API,
    }),
    @service(PhoneNumberService) private phoneNumService: PhoneNumberService,
  ) {
    this.validateEnvVars();
  }

  private validateEnvVars() {
    if (!process.env.SMS_TEMPLATE) {
      throw new Error('SMS template is not provided');
    }

    if (!process.env.KAVENEGAR_API) {
      throw new Error('KAVENEGAR API is not provided');
    }
  }

  public async sendSms(
    token1: string,
    receptor: string,
    token2?: string,
  ): Promise<KavenegarResponse> {
    receptor = this.phoneNumService.replacePlusWithDoubleZero(receptor);

    const sms: VerifyLookupSMS = {
      token: token1,
      token2: token2 ? token2 : undefined,
      template: String(this.SMS_TEMPLATE),
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
