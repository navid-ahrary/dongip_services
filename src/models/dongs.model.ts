import { Entity, model, property, belongsTo } from '@loopback/repository'
import { Eqip } from './eqip.model'
import { Users } from './users.model'
import { Category } from './category.model'

@model()
export class Dongs extends Entity
{
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
  factorType: string = 'factor' || 'percent' || 'amount'

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
    type: 'string',
  } )
  categoryName: string

  @belongsTo( () => Category )
  categoryId?: string

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
    required: true,
    type: 'array',
    itemType: 'object',
  } )
  eqip: Eqip[]

  @property( {
    type: 'string',
    required: false,
  } )
  virtualUsersId: string

  @belongsTo( () => Users )
  exManKey: string

  constructor ( data?: Partial<Dongs> )
  {
    super( data )
  }
}

export interface DongsRelations
{
  exMan?: DongsWithRelations
}

export type DongsWithRelations = Dongs & DongsRelations
