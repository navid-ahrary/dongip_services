import { belongsTo, model, property, RelationType } from '@loopback/repository';
import { BaseEntity } from './base-entity.model';
import { Categories } from './categories.model';
import { Dongs } from './dongs.model';
import { JointAccounts } from './joint-accounts.model';
import { CurrencyEnum } from './settings.model';
import { UsersRels } from './users-rels.model';
import { Users } from './users.model';

@model({
  name: 'bill_list',
  settings: {
    foreignKeys: {
      fkBillListUserId: {
        name: 'fk_bill_list_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkBillListCategoryId: {
        name: 'fk_bill_list_category_id',
        entity: 'categories',
        entityKey: 'id',
        foreignKey: 'categoryId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkBillListDongId: {
        name: 'fk_bill_list_dong_id',
        entity: 'dongs',
        entityKey: 'id',
        foreignKey: 'dongId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkBillListUserRelId: {
        name: 'fk_bill_list_user_rel_id',
        entity: 'users_rels',
        entityKey: 'id',
        foreignKey: 'userRelId',
        onUpdate: 'cascade',
        onDelete: 'set null',
      },
      fkBillListJointAccountId: {
        name: 'fk_bill_joint_account_id',
        entity: 'joint_accounts',
        entityKey: 'id',
        foreignKey: 'jointAccountId',
        onUpdate: 'cascade',
        onDelete: 'set null',
      },
    },
  },
})
export class BillList extends BaseEntity {
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
  billListId: number;

  @property({
    type: 'Number',
    required: true,
    mysql: {
      columnName: 'dong_amount',
      dataType: 'decimal(20, 3) unsigned',
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

  @belongsTo(
    () => UsersRels,
    {
      name: 'userRel',
      keyFrom: 'userRelId',
      keyTo: 'userRelId',
      type: RelationType.belongsTo,
      source: UsersRels,
      target: () => BillList,
    },
    {
      type: 'number',
      index: { normal: true },
      mysql: {
        columnName: 'user_rel_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'Y',
      },
    },
  )
  userRelId?: number;

  @property({
    type: 'string',
    jsonSchema: { maxLength: 50 },
    mysql: {
      columnName: 'user_rel_name',
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'Y',
    },
  })
  userRelName?: string;

  @belongsTo(
    () => Dongs,
    {
      name: 'dong',
      keyFrom: 'dongId',
      keyTo: 'dongId',
      type: RelationType.belongsTo,
      source: Dongs,
      target: () => BillList,
    },
    {
      type: 'number',
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
      name: 'categories',
      keyFrom: 'categoryId',
      keyTo: 'categoryId',
      type: RelationType.belongsTo,
      source: Categories,
      target: () => BillList,
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
      name: 'users',
      keyFrom: 'userId',
      keyTo: 'userId',
      type: RelationType.belongsTo,
      source: Users,
      target: () => BillList,
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
      target: () => BillList,
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

  constructor(data?: Partial<BillList>) {
    super(data);
  }
}

export interface BillListRelations {}

export type BillListWithRelations = BillList & BillListRelations;
