/* eslint-disable @typescript-eslint/naming-convention */
import { Entity, model, property, belongsTo, RelationType } from '@loopback/repository';
import { Users, UsersRels } from './';

@model({
  name: 'virtual_users',
  settings: {
    indexes: {
      'user_id&phone': {
        name: 'user_id&phone',
        columns: 'user_id, phone',
        options: { unique: true },
      },
      'user_id&user_rel_id': {
        name: 'user_id&user_rel_id',
        columns: 'user_id, user_rel_id',
        options: { unique: true },
      },
    },
    foreignKeys: {
      fkVirtualUsersUserId: {
        name: 'fk_virtual_users_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkVirtualUsersUserRelId: {
        name: 'fk_virtual_users_user_rel_id',
        entity: 'users_rels',
        entityKey: 'id',
        foreignKey: 'userRelId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class VirtualUsers extends Entity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
      nullable: 'N',
    },
  })
  virtualUserId: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: { maxLength: 20 },
    mysql: { dataType: 'varchar', dataLength: 20, nullable: 'N' },
  })
  phone: string;

  @property({
    type: 'string',
    jsonSchema: { maxLength: 100 },
    mysql: { dataType: 'varchar', dataLength: 100, nullable: 'Y' },
  })
  email?: string;

  @property({
    type: 'date',
    required: true,
    defaultFn: 'now',
    mysql: {
      columnName: 'created_at',
      dataType: 'datetime',
      nullable: 'N',
    },
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
    {
      type: 'number',
      required: true,
      index: { normal: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
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
      type: 'number',
      required: true,
      index: { normal: true },
      mysql: {
        columnName: 'user_rel_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  userRelId: number;

  @property({
    type: 'boolean',
    default: false,
    required: true,
    hidden: true,
    mysql: {
      dataType: 'tinyint',
      dataLength: 1,
      default: 0,
      nullable: 'N',
    },
  })
  deleted: boolean;

  constructor(data?: Partial<VirtualUsers>) {
    super(data);
  }
}

export interface VirtualUsersRelations {}

export type VirtualUsersWithRelations = VirtualUsers & VirtualUsersRelations;
