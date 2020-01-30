import { Entity, model, property, belongsTo } from '@loopback/repository';
import { Users } from './users.model';

@model()
export class UsersRels extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    required: false
  })
  _key: string;

  @property({
    type: 'string',
    required: false,
    generated: true
  })
  _rev: string;

  @property({
    type: 'string',
    required: true,
  })
  _from: string;

  @property({
    type: 'string',
    required: true,
  })
  _to: string;

  @property({
    type: 'string',
    required: true,
  })
  alias: string;

  @property({
    type: 'string',
    required: true,
  })
  avatar: string;

  @property({
    type: 'string',
    required: true,
  })
  type: string;

  @belongsTo(() => Users)
  usersId: string;

  constructor(data?: Partial<UsersRels>) {
    super(data);
  }
}

export interface UsersRelsRelations {
  // describe navigational properties here
}

export type UsersRelsWithRelations = UsersRels & UsersRelsRelations;
