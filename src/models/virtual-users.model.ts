import { Entity, model, property, belongsTo, } from '@loopback/repository'
import { Users } from './users.model'

@model()
export class VirtualUsers extends Entity {
  @property( {
    type: 'string',
    id: true,
    generated: true,
    required: false,
  } )
  _key: string

  @property( {
    type: 'string',
    required: false,
    generated: true
  } )
  _id: string

  @property( {
    type: 'string',
    required: false,
    generated: true
  } )
  _rev: string

  @property( {
    type: 'string',
    required: true,
  } )
  phone: string

  @belongsTo( () => Users, { name: 'belongsToUser' } )
  belongsToUserKey: string

  constructor ( data?: Partial<VirtualUsers> ) {
    super( data )
  }
}

export interface VirtualUsersRelations {
}

export type VirtualUsersWithRelations = VirtualUsers & VirtualUsersRelations
