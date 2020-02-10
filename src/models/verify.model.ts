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
<<<<<<< HEAD
    type: 'string',
    required: true,
  } )
  userAgent: string

  @property( {
    type: 'string'
  } )
  userKey?: string

  @property( {
=======
>>>>>>> parent of 2bd10d9a... login password muse hash verifyCode with salt
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
