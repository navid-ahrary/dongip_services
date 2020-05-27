import {Entity, model, property} from '@loopback/repository';

@model()
export class Blacklist extends Entity {
  @property({
    type: 'number',
    required: false,
    generated: true,
    id: true,
  })
  id: number;

  @property({
    type: 'string',
    required: true,
  })
  token: string;

  @property({
    type: 'date',
    required: false,
  })
  createdAt: object = new Date();

  constructor(data?: Partial<Blacklist>) {
    super(data);
  }
}

export interface BlacklistRelations {}

export type BlacklistWithRelations = Blacklist & BlacklistRelations;
