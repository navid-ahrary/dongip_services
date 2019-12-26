import {Entity, model, property} from '@loopback/repository';
import {Eqip} from './eqip.model';

@model()
export class Dongs extends Entity {
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
    required: false,
  })
  costs: number;

  @property({
    type: 'string',
    required: true,
  })
  desc?: string;

  @property({
    type: 'array',
    itemType: 'string',
    required: true,
  })
  categories: string[];

  @property({
    type: 'date',
    required: true,
  })
  createdAt: string;

  @property({
    type: 'number',
    required: false,
  })
  pong: number;

  @property({
    required: true,
    type: 'array',
    itemType: 'object',
  })
  eqip: Eqip[];

  @property({
    required: false,
    type: 'string',
  })
  expensesManger: string;

  @property({
    type: 'string',
    required: false,
  })
  virtualUsersId: string;

  constructor(data?: Partial<Dongs>) {
    super(data);
  }
}

export interface DongsRelations {}

export type DongsWithRelations = Dongs & DongsRelations;
