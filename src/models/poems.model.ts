import { Entity, model, property } from '@loopback/repository'

@model()
export class Poems extends Entity {
  @property( {
    type: 'string',
  } )
  '1': string

  @property( {
    type: 'string',
  } )
  '2': string

  @property( {
    type: 'string',
    id: true,
    generated: true,
  } )
  _key?: string

  @property( {
    type: 'string',
    required: false
  } )
  _id?: string


  constructor ( data?: Partial<Poems> ) {
    super( data )
  }
}

export interface PoemsRelations {
  // describe navigational properties here
}

export type PoemsWithRelations = Poems & PoemsRelations
