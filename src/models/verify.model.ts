import {Entity, model, property} from '@loopback/repository'

@model()
export class Verify extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    required: false,
  })
  _key: string

  @property({
    type: 'string',
    required: true,
  })
  code: string

  @property({
    type: 'string',
    required: true,
  })
  phone: string

  @property({
    type: 'string',
    required: true,
  })
  regToken: string

  @property({
    type: 'string',
    required: true,
  })
  agent: string

  @property({
    type: 'object',
    required: true,
  })
  date: object

  constructor (data?: Partial<Verify>) {
    super(data)
  }
}

export interface VerifyRelations {
  // describe navigational properties here
}

export type VerifyWithRelations = Verify & VerifyRelations
