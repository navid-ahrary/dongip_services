import { belongsTo, Entity, model, property, RelationType } from '@loopback/repository';

import { Categories } from './categories.model';
import { JointAccounts } from './joint-accounts.model';
import { CurrencyEnum } from './settings.model';
import { Users } from './users.model';
import { Dongs } from './dongs.model';

@model({
  name: 'joint_payers',
  settings: {
    foreignKeys: {
      fkPayerUserId: {
        name: 'fk_Payer_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkPayerCategoryId: {
        name: 'fk_Payer_category_id',
        entity: 'categories',
        entityKey: 'id',
        foreignKey: 'categoryId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkPayerDongId: {
        name: 'fk_Payer_dong_id',
        entity: 'dongs',
        entityKey: 'id',
        foreignKey: 'dongId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkPayerJointAccountId: {
        name: 'fk_Payer_joint_account_id',
        entity: 'joint_accounts',
        entityKey: 'id',
        foreignKey: 'jointAccountId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class JointPayers extends Entity {
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
    type: 'number',
    required: true,
    mysql: {
      columnName: 'paid_amount',
      dataType: 'bigint unsigned',
      dataLength: null,
      nullable: 'N',
    },
  })
  paidAmount: number;

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
      target: () => JointPayers,
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
      target: () => JointPayers,
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
      target: () => JointPayers,
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
      target: () => JointPayers,
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

  constructor(data?: Partial<JointPayers>) {
    super(data);
  }
}

export interface JointPayersRelations {
  // describe navigational properties here
}

export type JointPayersWithRelations = JointPayers & JointPayersRelations;
