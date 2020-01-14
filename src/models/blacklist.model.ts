import { Entity, model, property } from '@loopback/repository';

@model()
export class Blacklist extends Entity {
  @property({
    type: 'Number',
    required: false,
    generated: true,
    id: true
  })
  _key: Number;

  @property({
    type: 'string',
    required: true,
    id: false,
  })
  token: string;

  constructor(data?: Partial<Blacklist>) {
    super(data);
  }
}

export interface BlacklistRelations { }

export type BlacklistWithRelations = Blacklist & BlacklistRelations;
