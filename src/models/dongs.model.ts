import {Entity, model, property} from '@loopback/repository';

@model()
export class Dongs extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
  })
  accountType: string;

  constructor(data?: Partial<Dongs>) {
    super(data);
  }
}

export interface DongsRelations {
  // describe navigational properties here
}

export type DongsWithRelations = Dongs & DongsRelations;
