import {bind, BindingScope} from '@loopback/core';
import {config} from 'dotenv';
config();

const Kavenegar = require('kavenegar');

@bind({scope: BindingScope.SINGLETON})
export class SmsService {
  constructor(
    private smsApi = Kavenegar.KavenegarApi({
      apikey: process.env.KAVENEGAR_API,
    }),
  ) {}

  public sendSms(template: string, payload: string, receptor: string) {
    this.smsApi.VerifyLookup(
      {
        token: payload,
        template: template,
        type: 'sms',
        receptor: receptor.replace('+98', '0'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function (_response: any, _status: any) {
        console.log(_response, _status);
      },
    );
  }
}
