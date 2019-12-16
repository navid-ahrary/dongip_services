import {Entity, model, property} from '@loopback/repository';

@model()
export class Blacklist extends Entity {
  @property({
    type: 'array',
    itemType: 'string',
    required: true,
  })
  token: string[];

  constructor(data?: Partial<Blacklist>) {
    super(data);
  }
}

export interface BlacklistRelations {}

export type BlacklistWithRelations = Blacklist & BlacklistRelations;
