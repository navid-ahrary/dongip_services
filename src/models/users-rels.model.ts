/* eslint-disable @typescript-eslint/naming-convention */
import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
  hasOne,
  hasMany,
} from '@loopback/repository';

import {Users} from './';
import {VirtualUsers} from './virtual-users.model';
import {Budgets} from './budgets.model';

@model({
  name: 'users_rels',
  settings: {
    indexes: {
      'user_id&phone': {
        name: 'user_id&phone',
        columns: 'user_id, phone',
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
    mysql: {
      columnName: 'name',
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'Y',
    },
  })
  name?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {minLength: 3, maxLength: 512},
    mysql: {
      columnName: 'avatar',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'N',
    },
  })
  avatar: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {maxLength: 20},
    mysql: {
      columnName: 'type',
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'N',
    },
  })
  type: string;

  @property({
    type: 'string',
    index: {normal: true},
    jsonSchema: {maxLength: 20},
    mysql: {
      columnName: 'phone',
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'Y',
    },
  })
  phone: string;

  @belongsTo(
    () => Users,
    {
      source: Users,
      name: 'belongsToUser',
      type: RelationType.belongsTo,
      keyFrom: 'userId',
      keyTo: 'userId',
      target: () => UsersRels,
    },
    {
      type: 'number',
      required: true,
      index: {normal: true},
      mysql: {columnName: 'user_id', dataType: 'mediumint', nullable: 'N'},
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

  @hasMany(() => Budgets, {
    keyTo: 'userRelId',
    source: UsersRels,
    target: () => Budgets,
    name: 'budgets',
    type: RelationType.hasMany,
  })
  budgets: Budgets[];

  constructor(data?: Partial<UsersRels>) {
    super(data);
  }
}

export interface UsersRelsRelations {}

export type UsersRelsWithRelations = UsersRels & UsersRelsRelations;
