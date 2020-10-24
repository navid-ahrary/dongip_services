import { belongsTo, Entity, model, property, RelationType } from '@loopback/repository';

import { Categories } from './categories.model';
import { JointAccounts } from './joint-accounts.model';
import { CurrencyEnum } from './settings.model';
import { Users } from './users.model';
import { Dongs } from './dongs.model';

@model({
  name: 'joint_bills',
  settings: {
    foreignKeys: {
      fkBillListUserId: {
        name: 'fk_bill_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkBillListCategoryId: {
        name: 'fk_bill_category_id',
        entity: 'categories',
        entityKey: 'id',
        foreignKey: 'categoryId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkBillListDongId: {
        name: 'fk_bill_dong_id',
        entity: 'dongs',
        entityKey: 'id',
        foreignKey: 'dongId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkBillListJointAccountId: {
        name: 'fk_bill_joint_account_id',
        entity: 'joint_accounts',
        entityKey: 'id',
        foreignKey: 'jointAccountId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class JointBills extends Entity {
  @property({
    type: 'Number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
      dataLength: null,
      nullable: 'N',
    },
  })
  jointBillId?: number;

  @property({
    type: 'Number',
    required: true,
    mysql: {
      columnName: 'dong_amount',
      dataType: 'bigint unsigned',
      dataLength: null,
      nullable: 'N',
    },
  })
  dongAmount: number;

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
    type: 'string',
    required: true,
    jsonSchema: { maxLength: 50 },
    mysql: {
      columnName: 'name',
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'N',
    },
  })
  name?: string;

  @belongsTo(
    () => Dongs,
    {
      name: 'dong',
      keyFrom: 'dongId',
      keyTo: 'dongId',
      type: RelationType.belongsTo,
      source: Dongs,
      target: () => JointBills,
    },
    {
      type: 'Number',
      required: true,
      index: { normal: true },
      mysql: {
        columnName: 'dong_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  dongId: number;

  @belongsTo(
    () => Categories,
    {
      name: 'category',
      keyFrom: 'categoryId',
      keyTo: 'categoryId',
      type: RelationType.belongsTo,
      source: Categories,
      target: () => JointBills,
    },
    {
      type: 'number',
      required: true,
      index: { normal: true },
      mysql: {
        columnName: 'category_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  categoryId: number;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      type: RelationType.belongsTo,
      source: Users,
      target: () => JointBills,
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
    () => JointAccounts,
    {
      name: 'jointAccount',
      keyFrom: 'jointAccountId',
      keyTo: 'jointAccountId',
      type: RelationType.belongsTo,
      source: JointAccounts,
      target: () => JointBills,
    },
    {
      type: 'number',
      required: true,
      index: { normal: true },
      mysql: {
        columnName: 'joint_account_id',
        dataType: 'mediumint unsigned',
        nullable: 'Y',
      },
    },
  )
  jointAccountId: number;

  constructor(data?: Partial<JointBills>) {
    super(data);
  }
}

export interface JointBillsRelations {
  // describe navigational properties here
}

export type JointBillsWithRelations = JointBills & JointBillsRelations;
