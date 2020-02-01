import { Entity, model, property, belongsTo } from '@loopback/repository'
import { Category } from './category.model'
import { Dongs, DongsWithRelations } from './dongs.model'

@model()
export class CategoryBill extends Entity {
  @property( {
    type: 'string',
    id: true,
    generated: true,
  } )
  _key: string


  @property( {
    type: 'string',
    required: false,
  } )
  _id: string

  @property( {
    type: 'number',
    required: true,
  } )
  dong: number

  @property( {
    type: 'number',
    required: true,
  } )
  paidCost: number

  @property( {
    type: 'number',
    required: false,
  } )
  calculation: number

  @belongsTo( () => Category )
  categoryId: string

  @belongsTo( () => Dongs )
  dongsKey: string

  constructor ( data?: Partial<CategoryBill> ) {
    super( data )
  }
}

export interface CategoryBillRelations {
  dongsId?: DongsWithRelations
}

export type CategoryBillWithRelations = CategoryBill & CategoryBillRelations
