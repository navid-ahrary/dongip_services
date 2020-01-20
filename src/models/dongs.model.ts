import { Entity, model, property, belongsTo } from '@loopback/repository';
import { Eqip } from './eqip.model';
import { Users } from './users.model';
import { Category } from './category.model';

@model()
export class Dongs extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    required: false,
  })
  _key: string;

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
  desc: string;

  @property({
    type: 'string',
  })
  categoryName: string;

  @belongsTo(() => Category)
  categoryId?: string;

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
    type: 'string',
    required: false,
  })
  virtualUsersId: string;

  @belongsTo(() => Users)
  expensesManagerId: string;

  constructor(data?: Partial<Dongs>) {
    super(data);
  }
}

export interface DongsRelations {
  expensesManager?: DongsWithRelations;
}

export type DongsWithRelations = Dongs & DongsRelations;
