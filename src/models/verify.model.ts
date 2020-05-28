import {Entity, model, property} from '@loopback/repository';

@model()
export class Verify extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    required: false,
  })
  id: number;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

  @property({
    type: 'boolean',
    requried: true,
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
  firebaseToken: string;

  @property({
    type: 'string',
    required: true,
  })
  agent: string;

  @property({
    type: 'date',
    required: true,
  })
  issuedAt: object;

  constructor(data?: Partial<Verify>) {
    super(data);
  }
}

export interface VerifyRelations {}

export type VerifyWithRelations = Verify & VerifyRelations;
