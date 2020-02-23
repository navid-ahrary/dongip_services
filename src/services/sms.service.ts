import { bind, BindingScope } from '@loopback/core'
import { config } from 'dotenv'
const Kavenegar = require( 'kavenegar' )

@bind( { scope: BindingScope.SINGLETON } )
export class SmsService {
  constructor (
  ) {
    config()
  }

  smsApi = Kavenegar.KavenegarApi(
    { apikey: process.env.KAVENEGAR_API } )


  public sendSms ( template: string, token: string, receptor: string ) {
    this.smsApi.VerifyLookup( {
      token: token,
      template: template,
      type: 'sms',
      receptor: receptor.replace( '+98', '0' )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, function ( _response: any, _status: any ) {
      console.log( _response, _status )
    } )
  }
}
