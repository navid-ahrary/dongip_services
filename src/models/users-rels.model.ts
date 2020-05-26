import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
} from '@loopback/repository';

import {Users, CategoryBill, VirtualUsers} from './';

@model()
export class UsersRels extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    required: false,
  })
  _key: string;

  @property({
    type: 'string',
    required: false,
    generated: true,
  })
  _id: string;

  @property({
    type: 'string',
    required: false,
    generated: true,
  })
  _rev: string;

  @belongsTo(() => Users || VirtualUsers, {name: 'belongsToUser'})
  _from: string;

  @property({
    type: 'string',
  })
  _to: string;

  @property({
    type: 'string',
  })
  alias: string;

  @property({
    type: 'string',
  })
  avatar: string;

  @property({
    type: 'string',
  })
  type: string;

  @property({
    type: 'string',
  })
  phone: string;

  @hasMany(() => CategoryBill, {keyTo: 'belongsToUserRelId'})
  categoryBills: CategoryBill[];

  constructor(data?: Partial<UsersRels>) {
    super(data);
  }
}

export interface UsersRelsRelations {}

export type UsersRelsWithRelations = UsersRels & UsersRelsRelations;
