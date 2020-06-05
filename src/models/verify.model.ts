import {Entity, model, property} from '@loopback/repository';

@model()
export class Verify extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    required: false,
  })
  verifyId: number;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

  @property({
    type: 'boolean',
    required: true,
  })
  registered: boolean;

  @property({
    type: 'string',
    required: true,
    length: 13,
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
  userAgent: string;

  @property({
    type: 'date',
    required: true,
  })
  issuedAt: Date;

  constructor(data?: Partial<Verify>) {
    super(data);
  }
}

export interface VerifyRelations {}

export type VerifyWithRelations = Verify & VerifyRelations;
