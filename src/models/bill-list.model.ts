import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Dong} from './dong.model';
import {UsersRels} from './users-rels.model';
import {Category} from './category.model';

@model()
export class BillList extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    required: false,
  })
  id: number;

  @property({
    type: 'number',
    required: true,
  })
  dongAmount: number;

  @property({
    type: 'string',
    required: true,
  })
  createdAt: string;

  @belongsTo(() => UsersRels)
  usersRelsId: number;

  @belongsTo(() => Dong)
  dongId: number;

  @belongsTo(() => Category)
  categoryId: number;

  constructor(data?: Partial<BillList>) {
    super(data);
  }
}

export interface BillListRelations {}

export type BillListWithRelations = BillList & BillListRelations;
