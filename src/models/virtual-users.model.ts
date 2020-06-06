import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
} from '@loopback/repository';
import {Users} from './';
import {UsersRels} from './users-rels.model';

@model()
export class VirtualUsers extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    required: false,
  })
  virtualUserId: number;

  @property({
    type: 'string',
    required: true,
    length: 13,
  })
  phone: string;

  @property({
    type: 'date',
    required: true,
  })
  createdAt: string;

  @belongsTo(
    () => Users,
    {
      name: 'belongsToUser',
      type: RelationType.belongsTo,
      keyTo: 'userId',
      keyFrom: 'userId',
      targetsMany: false,
      source: Users,
      target: () => VirtualUsers,
    },
    {type: 'number', required: true},
  )
  userId: number;

  @belongsTo(
    () => UsersRels,
    {
      name: 'belongsToUserRel',
      type: RelationType.belongsTo,
      keyFrom: 'userRelId',
      keyTo: 'userRelId',
      source: UsersRels,
      target: () => VirtualUsers,
    },
    {type: 'number', required: true},
  )
  userRelId: number;

  constructor(data?: Partial<VirtualUsers>) {
    super(data);
  }
}

export interface VirtualUsersRelations {}

export type VirtualUsersWithRelations = VirtualUsers & VirtualUsersRelations;
