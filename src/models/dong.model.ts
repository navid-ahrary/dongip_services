import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
} from '@loopback/repository';

import {Users} from './users.model';
import {CategoryBill} from './category-bill.model';

@model()
export class Dong extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    required: false,
  })
  _key: string;

  @property({
    type: 'string',
    generated: true,
    required: false,
  })
  _id: string;

  @property({
    type: 'string',
    generated: true,
    required: false,
  })
  _rev: string;

  @property({
    type: 'string',
    requird: true,
  })
  title: string;

  @property({
    type: 'string',
    required: true,
  })
  desc: string;

  @property({
    type: 'string',
    required: true,
  })
  createdAt: string;

  @property({
    type: 'number',
    required: true,
  })
  pong: number;

  @belongsTo(() => Users, {name: 'belongsToUser'})
  belongsToUserId: string;

  @property({
    type: 'string',
  })
  categoryId: string;

  @hasMany(() => CategoryBill, {keyTo: 'belongsToDongId'})
  categoryBills: CategoryBill[];

  constructor(data?: Partial<Dong>) {
    super(data);
  }
}

export interface DongRelations {
  // categoryBill?: CategoryBillWithRelations;
}

export type DongWithRelations = Dong & DongRelations;
