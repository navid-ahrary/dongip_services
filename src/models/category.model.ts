import { Entity, model, property, belongsTo, hasMany } from '@loopback/repository'
import { Users } from './users.model'
import { CategoryBill } from './category-bill.model'

@model()
export class Category extends Entity {
  @property( {
    type: 'string',
    id: true,
    generated: true,
    required: false,
  } )
  _key: string

  @property( {
    type: 'string',
    generated: true,
    required: false,
  } )
  _id: string

  @property( {
    type: 'string',
    generated: true,
    required: false,
  } )
  _rev: string

  @property( {
    type: 'string',
    required: true,
  } )
  title: string

  @property( {
    type: 'string',
    required: true,
  } )
  icon: string

  @belongsTo( () => Users, { name: 'belongsToUser' } )
  belongsToUserKey: string

  @hasMany( () => CategoryBill, { keyTo: 'belongsToCategoryKey' } )
  categoryBills: CategoryBill[]

  constructor ( data?: Partial<Category> ) {
    super( data )
  }
}

export interface CategoryRelations {
}

export type CategoryWithRelations = Category & CategoryRelations
