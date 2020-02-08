import { Entity, model, property } from '@loopback/repository'

@model()
export class Verify extends Entity {
  @property( {
    type: 'string',
    id: true,
    generated: false,
    required: true,
  } )
  phone: string

  @property( {
    type: 'string',
    required: true,
  } )
  password: string

  @property( {
    type: 'string'
  } )
  userKey?: string

  @property( {
    type: 'date',
  } )
  createdAt?: string

  @property( {
    type: 'string',
  } )
  registerationToken?: string

  constructor ( data?: Partial<Verify> ) {
    super( data )
  }
}

export interface VerifyRelations {
  // describe navigational properties here
}

export type VerifyWithRelations = Verify & VerifyRelations
