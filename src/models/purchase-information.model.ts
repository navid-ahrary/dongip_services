import {Model, model, property} from '@loopback/repository';

@model()
export class PurchaseInformation extends Model {
  @property({
    type: 'string',
    id: true,
    generated: false,
    required: true,
  })
  orderId: string;

  @property({
    type: 'string',
    required: true,
  })
  productId: string;

  @property({
    type: 'number',
    required: true,
  })
  purchaseTime: number;

  @property({
    type: 'string',
    required: true,
  })
  purchaseToken: string;


  constructor(data?: Partial<PurchaseInformation>) {
    super(data);
  }
}

export interface PurchaseInformationRelations {
  // describe navigational properties here
}

export type PurchaseInformationWithRelations = PurchaseInformation & PurchaseInformationRelations;
