/* eslint-disable @typescript-eslint/naming-convention */
import {
  belongsTo,
  Entity,
  hasMany,
  hasOne,
  model,
  property,
  RelationType,
} from '@loopback/repository';
import { BillList } from './bill-list.model';
import { Budgets } from './budgets.model';
import { PayerList } from './payer-list.model';
import { Users } from './users.model';
import { VirtualUsers } from './virtual-users.model';

@model({
  name: 'users_rels',
  settings: {
    foreignKeys: {
      fkUsersRelsUserId: {
        name: 'fk_users_rels_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkUsersRelsUsersRelsId: {
        name: 'fk_users_rels_users_rels_id',
        entity: 'users_rels',
        entityKey: 'id',
        foreignKey: 'mutualUserRelId',
        onUpdate: 'cascade',
        onDelete: 'set null',
      },
    },
  },
})
export class UsersRels extends Entity {
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
  userRelId: number;

  @property({
    type: 'string',
    // required: true,
    jsonSchema: { maxLength: 50 },
    mysql: {
      columnName: 'name',
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'N',
    },
  })
  name?: string;

  @property({
    type: 'string',
    required: false,
    jsonSchema: {
      minLength: 3,
      maxLength: 512,
    },
    mysql: {
      columnName: 'avatar',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'Y',
    },
  })
  avatar?: string;

  @property({
    type: 'string',
    default: 'external',
    mysql: {
      columnName: 'type',
      dataType: 'varchar',
      dataLength: 10,
      default: 'external',
      nullable: 'N',
    },
  })
  type: 'self' | 'external';

  @property({
    type: 'string',
    index: { normal: true },
    jsonSchema: { maxLength: 20 },
    mysql: {
      columnName: 'phone',
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'Y',
    },
  })
  phone: string;

  @property({
    type: 'string',
    index: { normal: true },
    jsonSchema: { maxLength: 100 },
    mysql: {
      columnName: 'email',
      dataType: 'varchar',
      dataLength: 100,
      nullable: 'Y',
    },
  })
  email?: string;

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
      index: { normal: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        nullable: 'N',
      },
    },
  )
  userId: number;

  @property({
    type: 'date',
    required: false,
    mysql: {
      columnName: 'created_at',
      default: 'now',
      dataType: 'datetime',
      nullable: 'N',
    },
  })
  createdAt: string;

  @property({
    type: 'date',
    required: true,
    defaultFn: 'now',
    mysql: {
      columnName: 'updated_at',
      dataType: 'datetime',
      nullable: 'N',
    },
  })
  updatedAt: string;

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

  @belongsTo(
    () => UsersRels,
    { type: RelationType.belongsTo },
    {
      type: 'number',
      required: false,
      index: { normal: true },
      mysql: {
        columnName: 'mutual_user_rel_id',
        dataType: 'mediumint unsigned',
        nullable: 'Y',
      },
    },
  )
  mutualUserRelId?: number;

  @hasMany(() => BillList, { keyTo: 'userRelId' })
  billLists: BillList[];

  @hasMany(() => PayerList, { keyTo: 'userRelId' })
  payerLists: PayerList[];

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

  constructor(data?: Partial<UsersRels>) {
    super(data);
  }
}

export interface UsersRelsRelations {}

export type UsersRelsWithRelations = UsersRels & UsersRelsRelations;
