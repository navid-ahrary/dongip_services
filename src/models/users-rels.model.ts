import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
  hasOne,
} from '@loopback/repository';

import {Users} from './';
import {VirtualUsers} from './virtual-users.model';

@model()
export class UsersRels extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    required: false,
  })
  userRelId: number;

  @belongsTo(
    () => Users,
    {
      source: Users,
      name: 'belongsToUser',
      type: RelationType.belongsTo,
    },
    {type: 'number', required: true},
  )
  userId: number;

  @hasOne(() => VirtualUsers, {
    keyFrom: 'userRelId',
    keyTo: 'userRelId',
    source: UsersRels,
    target: () => VirtualUsers,
    name: 'virtualUsers',
    type: RelationType.hasOne,
  })
  hasOneVirtualUser: VirtualUsers;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

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

  @property({
    type: 'string',
    rqeuired: true,
    length: 13,
  })
  phone: string;

  constructor(data?: Partial<UsersRels>) {
    super(data);
  }
}

export interface UsersRelsRelations {}

export type UsersRelsWithRelations = UsersRels & UsersRelsRelations;
