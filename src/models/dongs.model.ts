import {Entity, model, property} from '@loopback/repository';

@model()
export class Dong extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    required: false,
  })
  id: string;

  @property({
    type: 'string',
    requird: true,
  })
  name: string;

  @property({
    type: 'number',
    required: true,
  })
  costs: number;

  @property({
    type: 'string',
    required: true,
  })
  decsription: string;

  @property({
    type: 'array',
    itemType: 'string',
    required: true,
  })
  assets: string[];

  @property({
    type: 'array',
    itemType: 'string',
    required: true,
  })
  items: string[];

  @property({
    type: 'date',
  })
  createdAt?: string;

  @property({
    type: 'object',
    required: true,
  })
  eqip: object;

  @property({
    type: 'object',
    required: true,
  })
  paidBy: object;

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Dong>) {
    super(data);
  }
}

export interface DongsRelations {
  // describe navigational properties here
}

export type DongsWithRelations = Dong & DongsRelations;
