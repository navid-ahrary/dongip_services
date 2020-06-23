import {bind, BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {config} from 'dotenv';
import {VerifyRepository} from '../repositories';
config();

const Kavenegar = require('kavenegar');

@bind({scope: BindingScope.SINGLETON})
export class SmsService {
  template = process.env.SMS_TEMPLATE;

  constructor(
    @repository(VerifyRepository) protected verifyRepository: VerifyRepository,
    protected smsApi = Kavenegar.KavenegarApi({
      apikey: process.env.KAVENEGAR_API,
    }),
  ) {}

  public async sendSms(code: string, receptor: string, verifyId: number) {
    const sms = {
      token: code,
      template: this.template,
      type: 'sms',
      receptor: receptor.replace('+98', '0'),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.smsApi.VerifyLookup(sms, async (response: any, statusCode: number) => {
      console.log('Kavenegar staus code: ', statusCode);

      if (statusCode) {
        await this.verifyRepository.updateById(verifyId, {
          kavenegarMessageId: response ? response.messageid : undefined,
          kavenegarSender: response ? response.sender : undefined,
          kavenegarDate: response ? response.date : undefined,
          kavenegarStatusCode: statusCode,
          kavenegarStatusText: response ? response.statustext : undefined,
        });
      }
    });
  }
}
