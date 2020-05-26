import {Entity, model, property, belongsTo} from '@loopback/repository';

import {Category, Dong, Users, UsersRels} from './';

@model()
export class CategoryBill extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
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

  @belongsTo(() => Dong, {name: 'belongsToDong'})
  belongsToDongId: string;

  @belongsTo(() => Category, {name: 'belongsToCategory'})
  belongsToCategoryId: string;

  @belongsTo(() => Users, {name: 'belongsToUser'})
  belongsToUserId: string;

  @belongsTo(() => UsersRels, {name: 'belongsToUserRel'})
  belongsToUserRelId: string;

  @property({
    type: 'number',
    requred: false,
  })
  dongAmount: number;

  @property({
    type: 'number',
    required: true,
  })
  paidAmount: number;

  @property({
    type: 'boolean',
    required: true,
  })
  settled: boolean;

  @property({
    type: 'date',
    required: false,
  })
  settledAt?: string;

  @property({
    type: 'date',
    requried: false,
  })
  createdAt: string;

  @property({
    type: 'string',
  })
  dongId?: string;

  constructor(data?: Partial<CategoryBill>) {
    super(data);
  }
}

export interface CategoryBillRelations {
  // dong?: DongsWithRelations;
}

export type CategoryBillWithRelations = CategoryBill & CategoryBillRelations;
