/* eslint-disable @typescript-eslint/no-floating-promises */
import { BindingScope, inject, injectable } from '@loopback/core';
import { HttpErrors } from '@loopback/rest';
import { messaging, initializeApp, credential, app } from 'firebase-admin';
import _ from 'lodash';
import { FirebaseBinding } from '../keys';

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
  private readonly app: app.App;

  private readonly messagingService: messaging.Messaging;

  private readonly timeToLiveSeconds = 60 * 60 * 24 * 7 * 4; // 4 weeks in seconds

  private readonly androidConfigs: messaging.AndroidConfig = {
    priority: 'high',
    ttl: this.timeToLiveSeconds * 1000,
    notification: { clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
  };

  private readonly apnsConfigs: messaging.ApnsConfig = {
    headers: {
      'apns-priority': String(10),
      'apns-expiration': String(this.timeToLiveSeconds * 1000), // 4 weeks in milliseconds,
    },
  };

  constructor(
    @inject(FirebaseBinding.FIREBASE_APPLICATION_DATABASEURL) private baseUrl: string,
    @inject(FirebaseBinding.FIREBASE_PROJECT_ID) private projectId: string,
    @inject(FirebaseBinding.FIREBASE_CLIENT_EMAIL) private clientEmail: string,
    @inject(FirebaseBinding.FIREBASE_PRIVATE_KEY) private privateKey: string,
  ) {
    this.app = this.initializeApp();
    this.messagingService = this.app.messaging();
  }

  private initializeApp() {
    const initApp = initializeApp({
      databaseURL: this.baseUrl,
      credential: credential.cert({
        projectId: this.projectId,
        clientEmail: this.clientEmail,
        privateKey: this.privateKey,
      }),
    });

    return initApp;
  }

  // send a message to a device
  public async sendToDeviceMessage(
    firebaseToken: string | string[],
    payload: messaging.MessagingPayload,
    options?: messaging.MessagingOptions,
  ): Promise<messaging.MessagingDevicesResponse> {
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
  public async sendMultiCastMessage(message: messaging.MulticastMessage, dryRun?: boolean) {
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
  public async sendAllMessage(messages: BatchMessage): Promise<messaging.BatchResponse> {
    _.forEach(messages, (message) => {
      _.assign(message, {
        android: this.androidConfigs,
        // apns: this.apnsConfigs,
      });
    });
    // msg._.assign(msg, {
    //   android: {
    //     priority: 'high',
    //     ttl: 1000 * 60 * 60 * 24 * 7 * 4, // 4 weeks in miliseconds
    //     notification: { clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
    //   },
    //   apns: {
    //     headers: {
    //       'apns-expiration': '1604750400',
    //     },
    //   },
    // }),

    try {
      const response = await this.messagingService.sendAll(messages);

      if (response.successCount) {
        console.log(`Successfully sent notifications, ${JSON.stringify(response)}`);
      } else if (response.failureCount) {
        console.warn(`Failed sent notifications: ${JSON.stringify(response)}`);
      } else {
        console.warn('There is no response from firebase');
      }

      return response;
    } catch (err) {
      console.warn(err);
      throw new Error(`Error sending notifications, ${err}`);
    }
  }
}
