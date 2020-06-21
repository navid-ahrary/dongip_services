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
import {Groups} from './groups.model';

@model({name: 'payer_list'})
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
        dataType: 'int',
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
