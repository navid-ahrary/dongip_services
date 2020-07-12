import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
} from '@loopback/repository';
import {Dongs} from './dongs.model';
import {UsersRels} from './users-rels.model';
import {Categories} from './categories.model';
import {Users} from './users.model';

@model({
  name: 'bill_list',
  settings: {
    foreignKeys: {
      fkBillListCategoryId: {
        name: 'fk_bill_list_category_id',
        entity: 'categories',
        entityKey: 'id',
        foreignKey: 'categoryId',
        onUpdate: 'restrict',
        onDelete: 'cascade',
      },
      fkBillListDongId: {
        name: 'fk_bill_list_dong_id',
        entity: 'dongs',
        entityKey: 'id',
        foreignKey: 'dongId',
        onUpdate: 'restrict',
        onDelete: 'cascade',
      },
      fkBillListUserRelId: {
        name: 'fk_bill_list_user_rel_id',
        entity: 'users_rels',
        entityKey: 'id',
        foreignKey: 'userRelId',
        onUpdate: 'restrict',
        onDelete: 'cascade',
      },
      fkBillListUserId: {
        name: 'fk_bill_list_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'restrict',
        onDelete: 'cascade',
      },
    },
  },
})
export class BillList extends Entity {
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
  billListId: number;

  @property({
    type: 'Number',
    required: true,
    mysql: {
      columnName: 'dong_amount',
      dataType: 'bigint',
      dataLength: null,
      nullable: 'N',
    },
  })
  dongAmount: number;

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

  @belongsTo(
    () => UsersRels,
    {
      name: 'userRels',
      keyFrom: 'userRelId',
      keyTo: 'userRelId',
      type: RelationType.belongsTo,
      source: UsersRels,
      target: () => BillList,
    },
    {
      type: 'number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_rel_id',
        dataType: 'int',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  userRelId: number;

  @belongsTo(
    () => Dongs,
    {
      name: 'dongs',
      keyFrom: 'dongId',
      keyTo: 'dongId',
      type: RelationType.belongsTo,
      source: Dongs,
      target: () => BillList,
    },
    {
      type: 'Number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'dong_id',
        dataType: 'int',
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
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'int',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  userId: number;

  constructor(data?: Partial<BillList>) {
    super(data);
  }
}

export interface BillListRelations {}

export type BillListWithRelations = BillList & BillListRelations;
