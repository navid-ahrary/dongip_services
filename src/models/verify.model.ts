import {Entity, model, property} from '@loopback/repository';

@model()
export class Verify extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    required: false,
  })
  _key: string;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

  @property({
    type: 'boolean',
    requried: true
  })
  registered: boolean;

  @property({
    type: 'string',
    required: true,
  })
  phone: string;

  @property({
    type: 'string',
    required: true,
  })
  registerationToken: string;

  @property({
    type: 'string',
    required: true,
  })
  agent: string;

  @property({
    type: 'string',
    required: false
  })
  ip: string;

  @property({
    type: 'date',
    required: true,
  })
  issuedAt: object;

  constructor (data?: Partial<Verify>) {
    super(data);
  }
}

export interface VerifyRelations {
  // describe navigational properties here
}

export type VerifyWithRelations = Verify & VerifyRelations;
