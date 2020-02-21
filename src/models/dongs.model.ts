import {
  Entity,
  model,
  property,
  belongsTo
} from '@loopback/repository'

import {
  Users,
  CategoryBill
} from './'

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
  exManUsersRelId: string

  @belongsTo( () => Users, { name: 'belongsToUser' } )
  belongsToExManId: string

  @property( {
    type: 'string',
  } )
  categoryId: string

  constructor ( data?: Partial<Dongs> ) {
    super( data )
  }
}

export interface DongsRelations {
}

export type DongsWithRelations = Dongs & DongsRelations
