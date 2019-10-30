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
    type: 'object',
    required: true,
  })
  spec: object;

  @property({
    type: 'date',
    required: false,
  })
  createDate: string;

  @property({
    type: 'array',
    itemType: 'string',
    required: true,
  })
  members: string[];

  constructor(data?: Partial<Dongs>) {
    super(data);
  }
}

export interface DongsRelations {
  // describe navigational properties here
}

export type DongsWithRelations = Dongs & DongsRelations;
