/* eslint-disable @typescript-eslint/no-floating-promises */
import {bind, BindingScope} from '@loopback/core';
import {
  messaging,
  initializeApp,
  credential,
  ServiceAccount,
} from 'firebase-admin';
import {HttpErrors} from '@loopback/rest';

import {config} from 'dotenv';
config();

export type MessagePayload = messaging.MessagingPayload;
export type BatchMessage = Array<messaging.Message>;

export interface FirebaseService {
  sendToDeviceMessage(
    firebaseToken: string | string[],
    payload: messaging.MessagingPayload,
    options?: messaging.MessagingOptions | undefined,
  ): void;
  sendMultiCastMessage(
    message: messaging.MulticastMessage,
    dryRun?: boolean,
  ): void;
  sendAllMessage(
    messages: Array<messaging.Message>,
  ): Promise<messaging.BatchResponse>;
}

@bind({scope: BindingScope.SINGLETON})
export class FirebaseService {
  constructor(
    private serviceAccount = require(`${process.env.GOOGLE_APPLICATION_CREDENTIALS}`),
  ) {
    this.initializeApp(serviceAccount);
  }

  private initializeApp(serviceAccount: ServiceAccount) {
    initializeApp({
      credential: credential.cert(serviceAccount),
      databaseURL: process.env.GOOGLE_APPLICATION_DATABASEURL,
    });
  }

  // send a message to a device
  public async sendToDeviceMessage(
    firebaseToken: string | string[],
    payload: messaging.MessagingPayload,
    options?: messaging.MessagingOptions | undefined,
  ): Promise<messaging.MessagingDevicesResponse> {
    const response = await messaging().sendToDevice(
      firebaseToken,
      payload,
      options,
    );

    if (response.successCount) {
      console.log(`Sucessfully sent notification: ${JSON.stringify(response)}`);
    } else if (response.failureCount) {
      console.error(`Failed sent notification${JSON.stringify(response)}`);
    } else {
      console.error('There is no response from firebase');
    }

    return response;
  }

  // send a message to multi devices
  public async sendMultiCastMessage(
    message: messaging.MulticastMessage,
    dryRun?: boolean,
  ) {
    await messaging()
      .sendMulticast(message, dryRun)
      .then(function (_response) {
        if (_response.failureCount > 0) {
          const failedTokens: string[] = [];
          _response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(message.tokens[idx]);
            }
          });
          console.error(`List of tokens that caused failure ${failedTokens}`);
          throw new HttpErrors.NotImplemented(
            `List of tokens that caused failure ${failedTokens}`,
          );
        }
        console.log(`Successfully sent notifications, ${_response}`);
      })
      .catch(function (_error) {
        console.log(`Error sending notifications, ${_error}`);
        throw new HttpErrors.NotImplemented(
          `Error sending notifications, ${_error}`,
        );
      });
  }

  //send multi message to multi devices
  public async sendAllMessage(
    messages: Array<messaging.Message>,
  ): Promise<messaging.BatchResponse> {
    const response = await messaging()
      .sendAll(messages)
      .catch(function (_error) {
        console.error(_error);
        throw new Error(`Error sending notifications, ${_error}`);
      });

    if (response.successCount) {
      console.log(
        `Successfully sent notifications, ${JSON.stringify(response)}`,
      );
    } else if (response.failureCount) {
      console.error(`Failed sent notifications: ${JSON.stringify(response)}`);
    } else {
      console.error('There is no response from firebase');
    }

    return response;
  }
}
