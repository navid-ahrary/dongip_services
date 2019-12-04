import {Entity, model, property} from '@loopback/repository';

@model()
export class Blacklist extends Entity {
  @property({
    type: 'string',
    required: true,
  })
  token: string;


  constructor(data?: Partial<Blacklist>) {
    super(data);
  }
}

export interface BlacklistRelations {
  // describe navigational properties here
}

export type BlacklistWithRelations = Blacklist & BlacklistRelations;
