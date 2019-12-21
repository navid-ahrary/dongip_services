import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Users, UsersWithRelations} from './users.model';
import {VirtualUsersWithRelations} from './virtual-users.model';
import {Categories} from './categories.model';

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
    required: true,
  })
  costs: number;

  @property({
    type: 'string',
    required: true,
  })
  decs?: string;

  @property({
    type: 'array',
    itemType: 'string',
    required: true,
  })
  assets?: string[];

  @property({
    type: 'array',
    itemType: 'string',
    required: true,
  })
  items: typeof Categories.prototype.id[];

  @property({
    type: 'date',
    required: true,
  })
  createdAt: string;

  @property({
    type: 'object',
    required: true,
  })
  paidBy: object;

  @belongsTo(() => Users)
  usersId: string;

  @property({
    type: 'string',
  })
  virtualUsersId?: string;

  constructor(data?: Partial<Dongs>) {
    super(data);
  }
}

export interface DongsRelations {
  users?: UsersWithRelations[];
  virtualUsers?: VirtualUsersWithRelations[];
}

export type DongsWithRelations = Dongs & DongsRelations;
