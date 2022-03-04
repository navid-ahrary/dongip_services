import { RequestHandler } from 'express-serve-static-core';

/**
 * Information from package.json
 */
export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  systemStatus: {
    maintenance: boolean;
    forceUpdate: boolean;
  };
}

/**
 * Subscription specs from subscription-scpecs.json
 */
export interface SubscriptionSpec {
  baseCallbackUrl: string;
  plans: {
    [planId: string]: {
      id: string;
      name: string;
      grade: string;
      period: { unit: 'month' | 'months' | 'year'; amount: number };
      regular: { [currency: string]: number };
      sale: { [currency: string]: number };
      onSale: boolean;
    };
  };
}

export interface LocalizedMessages {
  [key: string]: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [language: string]: any;
  };
}

export interface TutorialLinks {
  [key: string]: string;
}

export interface CategoriesSource {
  [language: string]: Array<{ id: number; title: string; icon: string }>;
}

export type FileUploadHandler = RequestHandler;
