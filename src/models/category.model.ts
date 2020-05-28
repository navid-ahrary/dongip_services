import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
} from '@loopback/repository';

import {Users, CategoryBill} from './';
import {BillList} from './bill-list.model';
import {PayerList} from './payer-list.model';

@model()
export class Category extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    required: false,
  })
  id: number;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @property({
    type: 'string',
    required: true,
  })
  icon: string;

  @belongsTo(() => Users, {name: 'belongsToUser'})
  belongsToUserId: typeof Users.prototype.id;

  @hasMany(() => CategoryBill, {keyTo: 'belongsToCategoryId'})
  categoryBills: CategoryBill[];

  @hasMany(() => BillList)
  billList: BillList[];

  @hasMany(() => PayerList)
  payerList: PayerList[];

  constructor(data?: Partial<Category>) {
    super(data);
  }
}

export interface CategoryRelations {}

export type CategoryWithRelations = Category & CategoryRelations;
