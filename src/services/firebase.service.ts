/* eslint-disable @typescript-eslint/no-floating-promises */
import { bind, BindingScope } from '@loopback/core'
import {
  messaging,
  initializeApp,
  credential,
  ServiceAccount
} from 'firebase-admin'
import { HttpErrors } from '@loopback/rest'
require( 'dotenv' ).config()

@bind( { scope: BindingScope.SINGLETON } )
export class FirebaseService {
  constructor () {
    const serviceAccount = require(
      `${ process.env.GOOGLE_APPLICATION_CREDENTIALS }`
    )
    this.initializeApp( serviceAccount )
  }

  initializeApp ( serviceAccount: ServiceAccount ) {
    initializeApp( {
      credential: credential.cert( serviceAccount ),
      databaseURL: process.env.GOOGLE_APPLICATION_DATABASEURL,
    } )
  }


  sendToDeviceMessage (
    registerationTokens: string | string[],
    payload: messaging.MessagingPayload,
    options?: messaging.MessagingOptions | undefined
  ) {
    messaging().sendToDevice( registerationTokens, payload, options )
      .then( function ( _response ) {
        console.log( _response )
      } ).catch( function ( _error ) {
        console.log( _error )
      } )
  }


  sendMultiCastMessage ( message: messaging.MulticastMessage ) {
    //send new dong notification to the nodes
    messaging().sendMulticast( message )
      .then( function ( _response ) {
        if ( _response.failureCount > 0 ) {
          const failedTokens: string[] = []
          _response.responses.forEach( ( resp, idx ) => {
            if ( !resp.success ) {
              failedTokens.push( message.tokens[ idx ] )
            }
          } )
          console.log( `List of tokens that caused failure ${ failedTokens }` )
          throw new HttpErrors.NotImplemented(
            `List of tokens that caused failure ${ failedTokens }`,
          )
        }
        console.log( `Successfully sent notifications, ${ _response }` )
      } )
      .catch( function ( _error ) {
        console.log( `Error sending notifications, ${ _error }` )
        throw new HttpErrors.NotImplemented(
          `Error sending notifications, ${ _error }`
        )
      } )
  }
}
