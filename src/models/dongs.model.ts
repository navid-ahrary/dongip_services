/* eslint-disable @typescript-eslint/naming-convention */
import { belongsTo, hasMany, hasOne, model, property, RelationType } from '@loopback/repository';
import { Accounts } from './accounts.model';
import { BaseEntity } from './base-entity.model';
import { BillList } from './bill-list.model';
import { Categories } from './categories.model';
import { JointAccounts, JointAccountsWithRelations } from './joint-accounts.model';
import { PayerList } from './payer-list.model';
import { Receipts } from './receipts.model';
import { Scores } from './scores.model';
import { Users } from './users.model';
import { Wallets } from './wallets.model';

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
      fkDongsWalletId: {
        name: 'fk_dongs_wallet_id',
        entity: 'wallets',
        entityKey: 'id',
        foreignKey: 'walletId',
        onUpdate: 'cascade',
        onDelete: 'set null',
      },
      fkDongsAccountId: {
        name: 'fk_dongs_account_id',
        entity: 'accounts',
        entityKey: 'id',
        foreignKey: 'accountId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class Dongs extends BaseEntity {
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
    type: 'number',
    required: true,
    mysql: {
      columnName: 'pong',
      dataType: 'decimal(20, 3) unsigned',
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

  @hasOne(() => Receipts, {
    name: 'receipt',
    keyTo: 'dongId',
    keyFrom: 'dongId',
    source: Dongs,
    target: () => Receipts,
    type: RelationType.hasOne,
    targetsMany: false,
  })
  receipt?: Receipts;

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

  @property({
    type: 'boolean',
    required: true,
    default: false,
    mysql: {
      columnName: 'income',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
      default: 0,
    },
  })
  income?: boolean | null;

  @belongsTo(
    () => Wallets,
    {
      source: Wallets,
      name: 'wallet',
      type: RelationType.belongsTo,
      keyFrom: 'walletId',
      keyTo: 'walletId',
      target: () => Dongs,
    },
    {
      type: 'number',
      required: false,
      index: { normal: true },
      mysql: {
        columnName: 'wallet_id',
        dataType: 'mediumint unsigned',
        nullable: 'Y',
      },
    },
  )
  walletId?: number;

  @belongsTo(
    () => Accounts,
    {
      source: Accounts,
      name: 'account',
      type: RelationType.belongsTo,
      keyFrom: 'accountId',
      keyTo: 'accountId',
      target: () => Dongs,
    },
    {
      type: 'number',
      required: false,
      index: { normal: true },
      mysql: {
        columnName: 'account_id',
        dataType: 'mediumint unsigned',
        nullable: 'Y',
      },
    },
  )
  accountId?: number;

  constructor(data?: Partial<Dongs>) {
    super(data);
  }
}

export interface DongsRelations {
  jointAccount?: JointAccountsWithRelations;
}

export type DongsWithRelations = Dongs & DongsRelations;
