import {
  Entity,
  model,
  property
} from '@loopback/repository'
import moment from 'moment'

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
    required: false
  } )
  createdAt: string = moment().format()

  constructor ( data?: Partial<Blacklist> ) {
    super( data )
  }
}

export interface BlacklistRelations { }

export type BlacklistWithRelations = Blacklist & BlacklistRelations
