/* eslint-disable @typescript-eslint/no-floating-promises */
import { BindingScope, inject, injectable } from '@loopback/core';
import { HttpErrors } from '@loopback/rest';
import * as firebase from 'firebase-admin';
import _ from 'lodash';
import { FirebaseBinding } from '../keys';

export type MessagePayload = firebase.messaging.MessagingPayload;
export type BatchMessage = Array<firebase.messaging.Message>;

export interface FirebaseService {
  sendToDeviceMessage(
    firebaseToken: string | string[],
    payload: MessagePayload,
    options?: firebase.messaging.MessagingOptions | undefined,
  ): void;

  sendMultiCastMessage(message: firebase.messaging.MulticastMessage, dryRun?: boolean): void;

  sendAllMessage(messages: BatchMessage): Promise<Array<firebase.messaging.BatchResponse>>;
}

@injectable({ scope: BindingScope.SINGLETON })
export class FirebaseService {
  private readonly messagingService: firebase.messaging.Messaging;

  private readonly timeToLiveSeconds = 60 * 60 * 24 * 7 * 4; // 4 weeks in seconds

  private readonly androidConfigs: firebase.messaging.AndroidConfig = {
    priority: 'normal',
    ttl: this.timeToLiveSeconds * 1000,
    notification: { clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
  };

  private readonly apnsConfigs: firebase.messaging.ApnsConfig = {
    headers: {
      'apns-priority': '10',
      'apns-expiration': String(this.timeToLiveSeconds * 1000), // 4 weeks in milliseconds,
    },
  };

  constructor(
    @inject(FirebaseBinding.FIREBASE_APPLICATION_DATABASEURL) baseUrl: string,
    @inject(FirebaseBinding.FIREBASE_DONGIP_USER_CERT) certs: firebase.ServiceAccount,
    @inject(FirebaseBinding.FIREBASE_DONGIP_USER_APP_NAME) appName: string,
  ) {
    this.messagingService = firebase
      .initializeApp(
        {
          databaseURL: baseUrl,
          credential: firebase.credential.cert(certs),
        },
        appName,
      )
      .messaging();
  }

  // send a message to a device
  public async sendToDeviceMessage(
    firebaseToken: string | string[],
    payload: firebase.messaging.MessagingPayload,
    options?: firebase.messaging.MessagingOptions,
  ): Promise<firebase.messaging.MessagingDevicesResponse> {
    const notifPayload = {
      data: payload.data,
      notification: {
        ...payload.notification,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    };

    const notifOptions = {
      ...options,
      priority: 'high',
      mutableContent: true,
      contentAvailable: true,
      timeToLive: this.timeToLiveSeconds,
    };

    const response = await this.messagingService.sendToDevice(
      firebaseToken,
      notifPayload,
      notifOptions,
    );

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
  public async sendMultiCastMessage(
    message: firebase.messaging.MulticastMessage,
    dryRun?: boolean,
  ) {
    try {
      message = {
        ...message,
        android: this.androidConfigs,
        // apns: this.apnsConfigs,
      };

      const response = await this.messagingService.sendMulticast(message, dryRun);

      if (response.failureCount > 0) {
        const failedTokens: string[] = [];

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(message.tokens[idx]);
          }
        });

        console.warn(`List of tokens that caused failure ${failedTokens}`);
        throw new HttpErrors.NotImplemented(`List of tokens that caused failure ${failedTokens}`);
      }

      console.log(`Successfully sent notifications, ${JSON.stringify(response)}`);
    } catch (err) {
      console.warn(`Error sending notifications, ${err}`);

      throw new HttpErrors.NotImplemented(`Error sending notifications, ${err}`);
    }
  }

  //send multi message to multi devices
  public async sendAllMessage(messages: BatchMessage) {
    _.forEach(messages, message => {
      _.assign(message, {
        android: this.androidConfigs,
        // apns: this.apnsConfigs,
      });
    });

    try {
      const response: firebase.messaging.BatchResponse[] = [];

      const chunkedMsgs = _.chunk(messages, 499);
      for (const msgs of chunkedMsgs) {
        const res = await this.messagingService.sendAll(msgs);

        response.push(res);

        if (res.successCount) {
          console.log(`Successfully sent notifications, ${JSON.stringify(res)}`);
        } else if (res.failureCount) {
          console.warn(`Failed sent notifications: ${JSON.stringify(res)}`);
        } else {
          console.warn('There is no response from firebase');
        }
      }

      return response;
    } catch (err) {
      console.warn(err);
      // throw new Error(`Error sending notifications, ${err}`);
    }
  }
}
