/* eslint-disable @typescript-eslint/naming-convention */
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
import {Scores} from './scores.model';
import {CurrencyEnum} from './settings.model';

@model({
  name: 'dongs',
  settings: {
    foreignKeys: {
      // fkDongsUserId: {
      //   name: 'fk_dongs_user_id',
      //   entity: 'users',
      //   entityKey: 'id',
      //   foreignKey: 'userId',
      //   onUpdate: 'cascade',
      //   onDelete: 'cascade',
      // },
      // fkDongsCategoryId: {
      //   name: 'fk_dongs_category_id',
      //   entity: 'categories',
      //   entityKey: 'id',
      //   foreignKey: 'categoryId',
      //   onUpdate: 'no action',
      //   onDelete: 'cascade',
      // },
    },
  },
})
export class Dongs extends Entity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
      dataLength: 8,
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
    type: 'number',
    required: true,
    mysql: {
      columnName: 'pong',
      dataLength: null,
      dataType: 'bigint unsigned',
      nullable: 'N',
    },
  })
  pong: number;

  @property({
    type: 'string',
    default: 'IRT',
    jsonSchema: {
      description: 'ISO 4217',
      minLength: 3,
      maxLength: 3,
      enum: Object.values(CurrencyEnum),
    },
    mysql: {
      dataType: 'varchar',
      dataLength: 3,
      nullable: 'N',
    },
  })
  currency: CurrencyEnum;

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
      type: 'number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
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
      type: 'number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'category_id',
        dataType: 'mediumint unsigned',
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
        dataType: 'mediumint unsigned',
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

  @hasMany(() => Scores, {
    name: 'scores',
    keyTo: 'dongId',
    keyFrom: 'dongId',
    source: Dongs,
    target: () => Scores,
    type: RelationType.hasMany,
    targetsMany: true,
  })
  scores: Scores[];

  constructor(data?: Partial<Dongs>) {
    super(data);
  }
}

export interface DongsRelations {}

export type DongsWithRelations = Dongs & DongsRelations;
