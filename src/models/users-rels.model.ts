import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
} from '@loopback/repository';

import {Users, CategoryBill} from './';

@model()
export class UsersRels extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    required: false,
  })
  id: number;

  @belongsTo(() => Users, {name: 'belongsToUser'})
  belongsToUserId: typeof Users.prototype.id;

  @property({
    type: 'number',
    required: false,
  })
  targetUserId: number;

  @property({
    type: 'string',
  })
  name: string;

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
