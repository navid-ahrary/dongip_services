import { Entity, model, property, belongsTo } from '@loopback/repository';
import { Category } from './category.model';
import { Dongs } from './dongs.model';

@model()
export class CategoryBill extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  _key?: string;

  @property({
    type: 'number',
    required: true,
  })
  dong: number;

  @property({
    type: 'number',
    required: true,
  })
  paidCost: number;

  @property({
    type: 'number',
    required: false,
  })
  calculation: number;

  @belongsTo(() => Category)
  categoryId: string;

  @belongsTo(() => Dongs)
  dongsId: string;

  constructor(data?: Partial<CategoryBill>) {
    super(data);
  }
}

export interface CategoryBillRelations {
  // describe navigational properties here
}

export type CategoryBillWithRelations = CategoryBill & CategoryBillRelations;
