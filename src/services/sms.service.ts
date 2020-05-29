import {bind, BindingScope} from '@loopback/core';
const Kavenegar = require('kavenegar');

import Debug from 'debug';
const debug = Debug('dongip');

import {config} from 'dotenv';
config();

@bind({scope: BindingScope.SINGLETON})
export class SmsService {
  constructor() {}

  smsApi = Kavenegar.KavenegarApi({apikey: process.env.KAVENEGAR_API});

  public sendSms(template: string, payload: string, receptor: string) {
    this.smsApi.VerifyLookup(
      {
        token: payload,
        template: template,
        type: 'sms',
        receptor: receptor.replace('+98', '0'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      },
      function (_response: any, _status: any) {
        debug(_response, _status);
      },
    );
  }
}
