import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
  RelationType,
} from '@loopback/repository';

import {Users} from './';
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
  categoryId: number;

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

  @belongsTo(
    () => Users,
    {
      name: 'users',
      keyFrom: 'userId',
      keyTo: 'userId',
      source: Users,
      target: () => Category,
    },
    {
      type: 'number',
      required: true,
    },
  )
  userId: number;

  @hasMany(() => BillList, {
    name: 'billLists',
    keyFrom: 'categoryId',
    keyTo: 'categoryId',
    type: RelationType.hasMany,
    source: Category,
    target: () => BillList,
    targetsMany: true,
  })
  billList: BillList[];

  @hasMany(() => PayerList, {
    name: 'payerLists',
    keyFrom: 'categoryId',
    keyTo: 'categoryId',
    type: RelationType.hasMany,
    source: Category,
    target: () => PayerList,
    targetsMany: true,
  })
  payerList: PayerList[];

  constructor(data?: Partial<Category>) {
    super(data);
  }
}

export interface CategoryRelations {}

export type CategoryWithRelations = Category & CategoryRelations;
