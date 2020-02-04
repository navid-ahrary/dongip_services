import { Entity, model, property, belongsTo } from '@loopback/repository'
import { Category } from './category.model'
import { Dongs } from './dongs.model'
import {Users} from './users.model';

@model()
export class CategoryBill extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  _key: string

  @property({
    type: 'string',
    generated: true,
    required: false,
  })
  _id: string

  @property({
    type: 'string',
    generated: true,
    required: false,
  })
  _rev: string

  @property({
    type: 'string',
  })
  _from: string

  @property({
    type: 'string',
  })
  _to: string

  @property({
    type: 'number',
  })
  dong: number

  @property({
    type: 'number',
  })
  paidCost: number

  @property({
    type: 'number',
    required: false,
  })
  calculation: number

  @belongsTo(() => Category, {name: 'belongsToCategory'})
  belongsToCategoryKey: string

  @belongsTo(() => Dongs, {name: 'belongsToDong'})
  belongsToDongKey: string

  @belongsTo(() => Users, {name: 'belongsToUser'})
  belongsToUserKey: string;

  constructor(data?: Partial<CategoryBill>) {
    super(data)
  }
}

export interface CategoryBillRelations {
}

export type CategoryBillWithRelations = CategoryBill & CategoryBillRelations
