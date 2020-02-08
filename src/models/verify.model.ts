import { Entity, model, property } from '@loopback/repository'

@model()
export class Verify extends Entity {
  @property( {
    type: 'string',
    id: true,
    generated: false,
    required: true,
  } )
  _key: string

  @property( {
    type: 'string',
    required: true,
  } )
  password: string

  @property( {
    type: 'date',
    required: true,
  } )
  createdAt: string

  constructor ( data?: Partial<Verify> ) {
    super( data )
  }
}

export interface VerifyRelations {
  // describe navigational properties here
}

export type VerifyWithRelations = Verify & VerifyRelations
