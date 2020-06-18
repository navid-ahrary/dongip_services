/* eslint-disable @typescript-eslint/naming-convention */
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

@model({
  name: 'users_rels',
  settings: {
    indexes: {
      'user_id&name': {
        name: 'user_id&name',
        columns: 'user_id, name',
        options: {unique: true},
      },
      'user_id&phone': {
        name: 'user_id&phone',
        columns: 'user_id, phone',
        options: {unique: true},
      },
      'user_id&name&phone': {
        name: 'user_id&name&phone',
        columns: 'user_id, name, phone',
        options: {unique: true},
      },
    },
  },
})
export class UsersRels extends Entity {
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
  userRelId: number;

  @property({
    type: 'string',
    jsonSchema: {maxLength: 50},
    mysql: {dataType: 'varchar', dataLength: 50, nullable: 'Y'},
  })
  name?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {minLength: 3, maxLength: 512},
    mysql: {dataType: 'varchar', dataLength: 512, nullable: 'N'},
  })
  avatar: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {maxLength: 20},
    mysql: {dataType: 'varchar', dataLength: 20, nullable: 'N'},
  })
  type: string;

  @property({
    type: 'string',
    index: {normal: true},
    jsonSchema: {maxLength: 20},
    mysql: {dataType: 'varchar', dataLength: 20, nullable: 'Y'},
  })
  phone: string;

  @belongsTo(
    () => Users,
    {
      source: Users,
      name: 'belongsToUser',
      type: RelationType.belongsTo,
    },
    {
      type: 'number',
      required: true,
      index: {normal: true},
      mysql: {columnName: 'user_id', dataType: 'int', nullable: 'N'},
    },
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

  constructor(data?: Partial<UsersRels>) {
    super(data);
  }
}

export interface UsersRelsRelations {}

export type UsersRelsWithRelations = UsersRels & UsersRelsRelations;
