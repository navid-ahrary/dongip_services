/* eslint-disable @typescript-eslint/no-floating-promises */
import { BindingScope, injectable } from '@loopback/core';
import { messaging, initializeApp, credential, ServiceAccount } from 'firebase-admin';
import { HttpErrors } from '@loopback/rest';

export type MessagePayload = messaging.MessagingPayload;
export type BatchMessage = Array<messaging.Message>;

export interface FirebaseService {
  sendToDeviceMessage(
    firebaseToken: string | string[],
    payload: MessagePayload,
    options?: messaging.MessagingOptions | undefined,
  ): void;
  sendMultiCastMessage(message: messaging.MulticastMessage, dryRun?: boolean): void;
  sendAllMessage(messages: BatchMessage): Promise<messaging.BatchResponse>;
}

@injectable({ scope: BindingScope.SINGLETON })
export class FirebaseService {
  constructor() {
    this.initializeApp();
  }

  private initializeApp() {
    const serviceAccount: ServiceAccount = require(`${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    initializeApp({
      credential: credential.cert({
        clientEmail: serviceAccount.clientEmail,
        privateKey: serviceAccount.privateKey,
        projectId: serviceAccount.projectId,
      }),
      databaseURL: process.env.GOOGLE_APPLICATION_DATABASEURL,
    });
  }

  // send a message to a device
  public async sendToDeviceMessage(
    firebaseToken: string | string[],
    payload: messaging.MessagingPayload,
    options?: messaging.MessagingOptions | undefined,
  ): Promise<messaging.MessagingDevicesResponse> {
    payload.notification!.clickAction = 'FLUTTER_NOTIFICATION_CLICK';

    const response = await messaging().sendToDevice(firebaseToken, payload, options);

    if (response.successCount) {
      console.log(`Sucessfully sent notification: ${JSON.stringify(response)}`);
    } else if (response.failureCount) {
      console.warn(`Failed sent notification${JSON.stringify(response)}`);
    } else {
      console.warn('There is no response from firebase');
    }

    return response;
  }

  // send a message to multi devices
  public async sendMultiCastMessage(message: messaging.MulticastMessage, dryRun?: boolean) {
    Object.assign(message, {
      // Android options
      android: {
        notification: { clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
      },
    });

    // Android options
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
          console.warn(`List of tokens that caused failure ${failedTokens}`);
          throw new HttpErrors.NotImplemented(`List of tokens that caused failure ${failedTokens}`);
        }
        console.log(`Successfully sent notifications, ${_response}`);
      })
      .catch(function (_error) {
        console.warn(`Error sending notifications, ${_error}`);
        throw new HttpErrors.NotImplemented(`Error sending notifications, ${_error}`);
      });
  }

  //send multi message to multi devices
  public async sendAllMessage(messages: BatchMessage): Promise<messaging.BatchResponse> {
    messages.forEach((msg) =>
      Object.assign(msg, {
        android: {
          notification: {
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
      }),
    );
    const response = await messaging()
      .sendAll(messages)
      .catch(function (_error) {
        console.error(_error);
        throw new Error(`Error sending notifications, ${_error}`);
      });

    if (response.successCount) {
      console.log(`Successfully sent notifications, ${JSON.stringify(response)}`);
    } else if (response.failureCount) {
      console.warn(`Failed sent notifications: ${JSON.stringify(response)}`);
    } else {
      console.warn('There is no response from firebase');
    }

    return response;
  }
}
