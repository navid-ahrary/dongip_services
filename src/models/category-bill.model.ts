import {
  Entity,
  model,
  property,
  belongsTo
} from '@loopback/repository'

import {
  Category,
  Dongs,
  Users,
  UsersRels
} from './'

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

  @belongsTo( () => Dongs, { name: 'belongsToDong' } )
  _from: string

  @belongsTo( () => Users, { name: 'belongsToUser' } )
  _to: string

  @belongsTo( () => Category, { name: 'belongsToCategory' } )
  belongsToCategoryId: string

  @property( {
    type: 'number',
    requred: false
  } )
  dong: number

  @property( {
    type: 'number',
    required: true
  } )
  paid: number

  @property( {
    type: 'string',
  } )
  guest?: string

  @property( {
    type: 'string',
    required: false
  } )
  userId: string

  @property( {
    type: 'number',
    required: true
  } )
  factor: number

  @property( {
    type: 'number',
    required: false,
  } )
  invoice: number

  @property( {
    type: 'boolean',
    required: true,
  } )
  settled: boolean

  @property( {
    type: 'date',
    required: false
  } )
  settledAt: 'string'

  @belongsTo( () => UsersRels )
  belongsToUserRelsId: string

  constructor ( data?: Partial<CategoryBill> ) {
    super( data )
  }
}

export interface CategoryBillRelations {
}

export type CategoryBillWithRelations = CategoryBill & CategoryBillRelations
