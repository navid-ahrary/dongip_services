import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
} from '@loopback/repository';
import {Dong} from './dong.model';
import {UsersRels} from './users-rels.model';
import {Category} from './category.model';
import {Users} from './users.model';

@model()
export class PayerList extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  payerListId: number;

  @property({
    type: 'number',
    required: true,
  })
  paidAmount: number;

  @property({
    type: 'string',
    required: true,
  })
  createdAt: string;

  @belongsTo(
    () => Dong,
    {
      name: 'dongs',
      keyFrom: 'dongId',
      keyTo: 'dongId',
      type: RelationType.belongsTo,
      source: Dong,
      target: () => PayerList,
    },
    {
      type: 'number',
      required: true,
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
      type: 'number',
      required: true,
    },
  )
  userRelId: number;

  @belongsTo(
    () => Category,
    {
      name: 'categories',
      keyFrom: 'categoryId',
      keyTo: 'categoryId',
      type: RelationType.belongsTo,
      source: Category,
      target: () => PayerList,
    },
    {
      type: 'number',
      required: true,
      store: {in: true, out: true, name: 'category'},
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
      type: 'number',
      required: true,
    },
  )
  userId: number;

  constructor(data?: Partial<PayerList>) {
    super(data);
  }
}

export interface PayerListRelations {}

export type PayerListWithRelations = PayerList & PayerListRelations;
