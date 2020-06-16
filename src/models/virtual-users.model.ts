import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
} from '@loopback/repository';
import {Users} from './';
import {UsersRels} from './users-rels.model';

@model({name: 'virtual_users'})
export class VirtualUsers extends Entity {
  @property({
    type: 'Number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'int',
      dataLength: null,
      nullable: 'N',
    },
  })
  virtualUserId: number;

  @property({
    type: 'string',
    required: true,
    length: 13,
    mysql: {dataType: 'varchar', dataLength: 13, nullable: 'N'},
  })
  phone: string;

  @property({
    type: 'date',
    required: true,
    mysql: {
      columnName: 'created_at',
      dataType: 'datetime',
      nullable: 'N',
    },
  })
  createdAt: string = new Date().toISOString();

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
    {
      type: 'Number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'int',
        dataLength: null,
        nullable: 'N',
      },
    },
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
    {
      type: 'Number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_rel_id',
        dataType: 'int',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  userRelId: number;

  constructor(data?: Partial<VirtualUsers>) {
    super(data);
  }
}

export interface VirtualUsersRelations {}

export type VirtualUsersWithRelations = VirtualUsers & VirtualUsersRelations;
