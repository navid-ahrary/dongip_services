/* eslint-disable @typescript-eslint/naming-convention */
import { Entity, model, property, belongsTo, hasMany, RelationType } from '@loopback/repository';

import { Users } from './users.model';
import { Categories } from './categories.model';
import { PayerList } from './payer-list.model';
import { BillList } from './bill-list.model';
import { Scores } from './scores.model';
import { CurrencyEnum } from './settings.model';
import { JointAccounts, JointAccountsWithRelations } from './joint-accounts.model';
import { Receipts } from './receipts.model';

@model({
  name: 'dongs',
  settings: {
    foreignKeys: {
      fkDongsUserId: {
        name: 'fk_dongs_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkDongsCategoryId: {
        name: 'fk_dongs_category_id',
        entity: 'categories',
        entityKey: 'id',
        foreignKey: 'categoryId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkDongsJointAccountId: {
        name: 'fk_dongs_joint_account_id',
        entity: 'joint_accounts',
        entityKey: 'id',
        foreignKey: 'jointAccountId',
        onUpdate: 'cascade',
        onDelete: 'set null',
      },
      fkDongsDongId: {
        name: 'fk_dongs_dong_id',
        entity: 'dongs',
        entityKey: 'id',
        foreignKey: 'originDongId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
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
      dataType: 'mediumint unsigned',
      nullable: 'N',
    },
  })
  dongId: number;

  @property({
    type: 'string',
    jsonSchema: { maxLength: 255 },
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
    jsonSchema: { maxLength: 255 },
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
  currency: string;

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
    () => Categories,
    {
      name: 'category',
      keyFrom: 'categoryId',
      keyTo: 'categoryId',
      source: Categories,
      target: () => Dongs,
      type: RelationType.belongsTo,
    },
    {
      type: 'number',
      required: true,
      index: { normal: true },
      jsonSchema: { minimum: 1, type: 'number' },
      mysql: {
        columnName: 'category_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  categoryId: number;

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

  @belongsTo(
    () => JointAccounts,
    {
      name: 'jointAccount',
      keyFrom: 'jointAccountId',
      keyTo: 'jointAccountId',
      type: RelationType.belongsTo,
      source: JointAccounts,
      target: () => Dongs,
    },
    {
      type: 'number',
      index: { normal: true },
      mysql: {
        columnName: 'joint_account_id',
        dataType: 'mediumint unsigned',
        nullable: 'Y',
      },
    },
  )
  jointAccountId?: number;

  @property({
    type: 'number',
    index: { normal: true },
    mysql: {
      columnName: 'origin_dong_id',
      dataType: 'mediumint unsigned',
      nullable: 'Y',
    },
  })
  originDongId?: number;

  @property({
    type: 'boolean',
    required: true,
    default: true,
    mysql: {
      columnName: 'include_budget',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
      default: 1,
    },
  })
  includeBudget: boolean | null;

  @property({
    type: 'boolean',
    required: true,
    default: true,
    mysql: {
      columnName: 'include_bill',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
      default: 1,
    },
  })
  includeBill: boolean | null;

  @hasMany(() => Receipts, { keyTo: 'dongId' })
  receiptions: Receipts[];

  constructor(data?: Partial<Dongs>) {
    super(data);
  }
}

export interface DongsRelations {
  jointAccount?: JointAccountsWithRelations;
}

export type DongsWithRelations = Dongs & DongsRelations;
