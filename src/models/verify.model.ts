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
  code: string;

  @property({
    type: 'number',
    required: false,
    default: 0,
  })
  try: number;

  constructor(data?: Partial<Verify>) {
    super(data);
  }
}

export interface VerifyRelations {
  // describe navigational properties here
}

export type VerifyWithRelations = Verify & VerifyRelations;
