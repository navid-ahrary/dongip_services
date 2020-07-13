/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/camelcase */
import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
  RelationType,
} from '@loopback/repository';

import {Users} from './users.model';
import {Categories} from './categories.model';
import {PayerList} from './payer-list.model';
import {BillList} from './bill-list.model';
import {Groups} from './groups.model';

@model({
  name: 'dongs',
  settings: {
    foreignKeys: {
      fkDongsCategoryId: {
        name: 'fk_dongs_category_id',
        entity: 'categories',
        entityKey: 'id',
        foreignKey: 'categoryId',
        onUpdate: 'restrict',
        onDelete: 'cascade',
      },
      fkDongsUserId: {
        name: 'fk_dongs_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'restrict',
        onDelete: 'cascade',
      },
      fkDongsGroupId: {
        name: 'fk_dongs_group_id',
        entity: 'groups',
        entityKey: 'id',
        foreignKey: 'groupId',
        onUpdate: 'restrict',
        onDelete: 'no action',
      },
    },
  },
})
export class Dongs extends Entity {
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
  dongId: number;

  @property({
    type: 'string',
    jsonSchema: {maxLength: 255},
    mysql: {
      columnName: 'title',
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'Y',
    },
  })
  title?: string;

  @property({
    type: 'string',
    jsonSchema: {maxLength: 255},
    mysql: {
      columnName: 'desc',
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'Y',
    },
  })
  desc?: string;

  @property({
    type: 'date',
    required: true,
    mysql: {
      columnName: 'created_at',
      dataType: 'datetime',
      dataLength: null,
      nullable: 'N',
    },
  })
  createdAt: string;

  @property({
    type: 'Number',
    required: true,
    mysql: {
      columnName: 'pong',
      dataLength: null,
      dataType: 'bigint',
      nullable: 'N',
    },
  })
  pong: number;

  @belongsTo(
    () => Users,
    {
      name: 'users',
      keyFrom: 'userId',
      keyTo: 'userId',
      source: Users,
      target: () => Dongs,
      type: RelationType.belongsTo,
    },
    {
      type: 'Number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  userId: number;

  @belongsTo(
    () => Categories,
    {
      name: 'categories',
      keyFrom: 'categoryId',
      keyTo: 'categoryId',
      source: Categories,
      target: () => Dongs,
      type: RelationType.belongsTo,
    },
    {
      type: 'Number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'category_id',
        dataType: 'int',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  categoryId: number;

  @belongsTo(
    () => Groups,
    {
      name: 'group',
      keyFrom: 'groupId',
      keyTo: 'groupId',
      source: Groups,
      target: () => Dongs,
      type: RelationType.belongsTo,
    },
    {
      type: 'number',
      index: {normal: true},
      mysql: {
        columnName: 'group_id',
        dataType: 'int',
        dataLength: null,
        nullable: 'Y',
      },
    },
  )
  groupId?: number;

  @hasMany(() => BillList, {
    name: 'billList',
    keyFrom: 'dongId',
    keyTo: 'dongId',
    source: Dongs,
    target: () => BillList,
    type: RelationType.hasMany,
    targetsMany: true,
  })
  billList: BillList[];

  @hasMany(() => PayerList, {
    name: 'payerList',
    keyFrom: 'dongId',
    keyTo: 'dongId',
    source: Dongs,
    target: () => PayerList,
    type: RelationType.hasMany,
    targetsMany: true,
  })
  payerList: PayerList[];

  constructor(data?: Partial<Dongs>) {
    super(data);
  }
}

export interface DongsRelations {}

export type DongsWithRelations = Dongs & DongsRelations;
