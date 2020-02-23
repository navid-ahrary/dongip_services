import {
  Entity,
  model,
  property
} from '@loopback/repository'

@model()
export class Blacklist extends Entity {
  @property( {
    type: 'string',
    required: false,
    generated: true,
    id: true
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
    required: true
  } )
  token: string

  @property( {
    type: 'date',
    required: false,
    geenrated: true
  } )
  createdAt: string

  constructor ( data?: Partial<Blacklist> ) {
    super( data )
  }
}

export interface BlacklistRelations { }

export type BlacklistWithRelations = Blacklist & BlacklistRelations
