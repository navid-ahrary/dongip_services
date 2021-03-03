import { Model, model, property } from '@loopback/repository';
import { PurchaseOriginEnum } from './purchases.model';

@model()
export class InappPurchase extends Model {
  @property({ type: 'string', required: true })
  planId: string;

  @property({ type: 'number', required: true })
  purchaseUnixTime: number;

  @property({ type: 'string', required: true })
  purchaseToken: string;

  @property({
    type: 'string',
    required: false,
    jsonSchema: { default: 'cafebazaar', enum: Object.values(PurchaseOriginEnum) },
  })
  purchaseOrigin?: string;

  constructor(data?: Partial<InappPurchase>) {
    super(data);
  }
}

export interface InappPurchaseRelations {
  // describe navigational properties here
}

export type InappPurchaseWithRelations = InappPurchase & InappPurchaseRelations;
