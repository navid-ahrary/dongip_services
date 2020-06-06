import {Entity, model, property} from '@loopback/repository';

@model()
export class Blacklist extends Entity {
  @property({
    type: 'string',
    required: true,
    id: true,
  })
  token: string;

  @property({
    type: 'date',
    required: false,
  })
  createdAt: string = new Date().toISOString();

  constructor(data?: Partial<Blacklist>) {
    super(data);
  }
}

export interface BlacklistRelations {}

export type BlacklistWithRelations = Blacklist & BlacklistRelations;
