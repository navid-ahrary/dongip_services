import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Eqip} from './eqip.model';
import {Users, UsersWithRelations} from './users.model';

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

  @belongsTo(() => Users)
  usersId: typeof Users.prototype.id;

  constructor(data?: Partial<Dongs>) {
    super(data);
  }
}

export interface DongsRelations {
  users?: UsersWithRelations;
}

export type DongsWithRelations = Dongs & DongsRelations;
