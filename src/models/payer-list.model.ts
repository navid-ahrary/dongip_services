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

enum CurrencyEnum {
  IRAN_RIAL = 'IRR',
  IRAN_TOMAN = 'IRT',
  DUBAI_DIRHAM = 'AED',
  US_DOLLAR = 'USD',
  EUROPE_EURO = 'EUR',
}

@model({
  name: 'payer_list',
  settings: {
    foreignKeys: {
      fkPayerListUserId: {
        name: 'fk_payer_list_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkPayerListCategoryId: {
        name: 'fk_payer_list_category_id',
        entity: 'categories',
        entityKey: 'id',
        foreignKey: 'categoryId',
        onUpdate: 'no action',
        onDelete: 'cascade',
      },
      fkPayerListDongId: {
        name: 'fk_payer_list_dong_id',
        entity: 'dongs',
        entityKey: 'id',
        foreignKey: 'dongId',
        onUpdate: 'no action',
        onDelete: 'cascade',
      },
      fkPayerListUserRelId: {
        name: 'fk_payer_list_user_rel_id',
        entity: 'users_rels',
        entityKey: 'id',
        foreignKey: 'userRelId',
        onUpdate: 'no action',
        onDelete: 'cascade',
      },
    },
  },
})
export class PayerList extends Entity {
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
  payerListId: number;

  @property({
    type: 'number',
    required: true,
    mysql: {
      columnName: 'paid_amount',
      dataType: 'bigint',
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
  currency: CurrencyEnum;

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
    () => Dongs,
    {
      name: 'dongs',
      keyFrom: 'dongId',
      keyTo: 'dongId',
      type: RelationType.belongsTo,
      source: Dongs,
      target: () => PayerList,
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
    () => UsersRels,
    {
      name: 'userRels',
      keyFrom: 'userRelId',
      keyTo: 'userRelId',
      type: RelationType.belongsTo,
      source: UsersRels,
      target: () => PayerList,
    },
    {
      type: 'Number',
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
    () => Categories,
    {
      name: 'categories',
      keyFrom: 'categoryId',
      keyTo: 'categoryId',
      type: RelationType.belongsTo,
      source: Categories,
      target: () => PayerList,
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
    () => Users,
    {
      name: 'users',
      keyFrom: 'userId',
      keyTo: 'userId',
      type: RelationType.belongsTo,
      source: Users,
      target: () => PayerList,
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

  constructor(data?: Partial<PayerList>) {
    super(data);
  }
}

export interface PayerListRelations {}

export type PayerListWithRelations = PayerList & PayerListRelations;
