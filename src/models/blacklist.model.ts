import { Entity, model, property } from '@loopback/repository'

@model()
export class Blacklist extends Entity {
  @property( {
    type: 'string',
    required: true,
    id: true
  } )
  _key: string

  @property( {
    type: 'string',
    required: false,
    generated: true
  } )
  _id: string

  constructor ( data?: Partial<Blacklist> ) {
    super( data )
  }
}

export interface BlacklistRelations { }

export type BlacklistWithRelations = Blacklist & BlacklistRelations
