import {Entity, model, property, belongsTo} from '@loopback/repository';

import {Category, Dong, Users, UsersRels} from './';

@model()
export class CategoryBill extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    required: false,
  })
  id: number;

  @belongsTo(() => Dong, {name: 'belongsToDong'})
  belongsToDongId: typeof Dong.prototype.id;

  @belongsTo(() => Category, {name: 'belongsToCategory'})
  belongsToCategoryId: typeof Category.prototype.id;

  @belongsTo(() => Users, {name: 'belongsToUser'})
  belongsToUserId: typeof Users.prototype.id;

  @belongsTo(() => UsersRels, {name: 'belongsToUserRel'})
  belongsToUserRelId: typeof UsersRels.prototype.id;

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
    type: 'string',
    required: false,
  })
  settledAt?: string;

  @property({
    type: 'string',
    requried: true,
  })
  createdAt: string;

  constructor(data?: Partial<CategoryBill>) {
    super(data);
  }
}

export interface CategoryBillRelations {}

export type CategoryBillWithRelations = CategoryBill & CategoryBillRelations;
