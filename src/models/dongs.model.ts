import { Entity, model, property, belongsTo } from '@loopback/repository'
import { Users } from './users.model'
import { Category } from './category.model'
import { CategoryBill } from './category-bill.model'

@model()
export class Dongs extends Entity {
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
    requird: true,
  } )
  title: string

  @property( {
    type: 'string',
    requird: true,
  } )
  factorType: string

  @property( {
    type: 'number',
    required: false,
  } )
  costs: number

  @property( {
    type: 'string',
    required: true,
  } )
  desc: string

  @property( {
    type: 'date',
    required: true,
  } )
  createdAt: string

  @property( {
    type: 'number',
    required: false,
  } )
  pong: number

  @property( {
    type: 'array',
    itemType: 'object',
  } )
  bill: CategoryBill[]

  @property( {
    type: 'string',
  } )
  xManUsersRelId: string

  @belongsTo( () => Users, { name: 'belongsToUser' } )
  belongsToUserKey: string

  @property( {
    type: 'string',
  } )
  categoryId: string

  @belongsTo( () => Category, { name: 'belongsToCategory' } )
  belongsToCategoryKey: string

  constructor ( data?: Partial<Dongs> ) {
    super( data )
  }
}

export interface DongsRelations {
}

export type DongsWithRelations = Dongs & DongsRelations
