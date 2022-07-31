import { Model, model, property } from '@loopback/repository';

@model()
export class PatchDongsDto extends Model {
  @property({ type: 'number' })
  accountId?: number;

  @property({ type: 'number' })
  categoryId?: number;

  @property({ type: 'number' })
  receiptId?: number;

  @property({ type: 'string' })
  title?: string;

  @property({ type: 'string' })
  desc?: string;

  @property({
    type: 'number',
    jsonSchema: { maximum: 999999999999 },
  })
  pong?: number;

  @property({ type: 'string' })
  createdAt?: string;

  @property({ type: 'boolean' })
  includeBudget?: boolean;

  @property({ type: 'number' })
  walletId?: number;

  constructor(data?: Partial<PatchDongsDto>) {
    super(data);
  }
}

export interface PatchDongsDtoRelations {
  // describe navigational properties here
}

export type PatchDongsDtoWithRelations = PatchDongsDto & PatchDongsDtoRelations;
