import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
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

  @belongsTo(
    () => VirtualUsers,
    {
      source: VirtualUsers,
      name: 'belongsToVirtualUser',
      type: RelationType.belongsTo,
    },
    {type: 'number'},
  )
  virtualUserId: number;

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
  })
  phone: string;

  constructor(data?: Partial<UsersRels>) {
    super(data);
  }
}

export interface UsersRelsRelations {}

export type UsersRelsWithRelations = UsersRels & UsersRelsRelations;
