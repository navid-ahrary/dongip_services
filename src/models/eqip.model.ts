import { Model, model, property } from '@loopback/repository'
@model()
export class Eqip extends Model {
  @property( {
    type: 'string',
    required: true,
  } )
  usersRelsId: string

  @property( {
    type: 'string',
  } )
  guest?: string

  @property( {
    type: 'number',
    required: true,
  } )
  paidCost: number

  @property( {
    type: 'number',
    required: true,
  } )
  factor: number

  @property( {
    type: 'number',
    required: false,
  } )
  dong: number

  constructor ( data?: Partial<Eqip> ) {
    super( data )
  }
}

export interface EqipRelations {
  // describe navigational properties here
}

export type EqipWithRelations = Eqip & EqipRelations
