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

@model()
export class BillList extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    required: false,
  })
  billListId: number;

  @property({
    type: 'number',
    required: true,
  })
  dongAmount: number;

  @property({
    type: 'date',
    required: true,
  })
  createdAt: Date;

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
    {type: 'number', required: true},
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
    {type: 'number', required: true},
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
    {type: 'number', required: true},
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
    {type: 'number', required: true},
  )
  userId: number;

  constructor(data?: Partial<BillList>) {
    super(data);
  }
}

export interface BillListRelations {}

export type BillListWithRelations = BillList & BillListRelations;
