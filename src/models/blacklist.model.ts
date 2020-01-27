import { Entity, model, property } from '@loopback/repository';

@model()
export class Blacklist extends Entity {
  @property({
    type: 'string',
    required: false,
    generated: true,
    id: true
  })
  _key: string;

  constructor(data?: Partial<Blacklist>) {
    super(data);
  }
}

export interface BlacklistRelations { }

export type BlacklistWithRelations = Blacklist & BlacklistRelations;
