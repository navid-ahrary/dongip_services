import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
} from '@loopback/repository';

import {Users} from './users.model';
import {CategoryBill} from './category-bill.model';
import {Category} from './category.model';

@model()
export class Dong extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    required: false,
  })
  id: number;

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
  belongsToUserId: typeof Users.prototype.id;

  @property({
    type: 'number',
  })
  categoryId: typeof Category.prototype.id;

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
