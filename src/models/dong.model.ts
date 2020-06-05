import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
  RelationType,
} from '@loopback/repository';

import {Users} from './users.model';
import {Category} from './category.model';
import {PayerList} from './payer-list.model';
import {BillList} from './bill-list.model';

@model()
export class Dong extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    required: false,
  })
  dongId: number;

  @property({
    type: 'string',
  })
  title?: string;

  @property({
    type: 'string',
  })
  desc?: string;

  @property({
    type: 'date',
    required: true,
  })
  createdAt: object;

  @property({
    type: 'number',
    required: true,
  })
  pong: number;

  @belongsTo(
    () => Users,
    {
      name: 'users',
      keyFrom: 'userId',
      keyTo: 'userId',
      source: Users,
      target: () => Dong,
      type: RelationType.belongsTo,
    },
    {type: 'number', required: true},
  )
  userId: number;

  @hasMany(() => BillList, {
    name: 'billList',
    keyFrom: 'dongId',
    keyTo: 'dongId',
    source: Dong,
    target: () => BillList,
    type: RelationType.hasMany,
    targetsMany: true,
  })
  billList: BillList[];

  @hasMany(() => PayerList, {
    name: 'payerList',
    keyFrom: 'dongId',
    keyTo: 'dongId',
    source: Dong,
    target: () => PayerList,
    type: RelationType.hasMany,
    targetsMany: true,
  })
  payerList: PayerList[];

  @belongsTo(
    () => Category,
    {
      name: 'categories',
      keyFrom: 'categoryId',
      keyTo: 'categoryId',
      source: Category,
      target: () => Dong,
      type: RelationType.belongsTo,
    },
    {type: 'number', required: true},
  )
  categoryId: number;

  constructor(data?: Partial<Dong>) {
    super(data);
  }
}

export interface DongRelations {}

export type DongWithRelations = Dong & DongRelations;
