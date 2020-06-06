import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
  RelationType,
} from '@loopback/repository';

import {Users} from './users.model';
import {Categories} from './categories.model';
import {PayerList} from './payer-list.model';
import {BillList} from './bill-list.model';

@model()
export class Dongs extends Entity {
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
      target: () => Dongs,
      type: RelationType.belongsTo,
    },
    {type: 'number', required: true},
  )
  userId: number;

  @hasMany(() => BillList, {
    name: 'billList',
    keyFrom: 'dongId',
    keyTo: 'dongId',
    source: Dongs,
    target: () => BillList,
    type: RelationType.hasMany,
    targetsMany: true,
  })
  billList: BillList[];

  @hasMany(() => PayerList, {
    name: 'payerList',
    keyFrom: 'dongId',
    keyTo: 'dongId',
    source: Dongs,
    target: () => PayerList,
    type: RelationType.hasMany,
    targetsMany: true,
  })
  payerList: PayerList[];

  @belongsTo(
    () => Categories,
    {
      name: 'categories',
      keyFrom: 'categoryId',
      keyTo: 'categoryId',
      source: Categories,
      target: () => Dongs,
      type: RelationType.belongsTo,
    },
    {type: 'number', required: true},
  )
  categoryId: number;

  constructor(data?: Partial<Dongs>) {
    super(data);
  }
}

export interface DongsRelations {}

export type DongsWithRelations = Dongs & DongsRelations;
