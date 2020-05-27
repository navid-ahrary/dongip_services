import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Dong} from './dong.model';
import {UsersRels} from './users-rels.model';

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

  @belongsTo(() => UsersRels)
  usersRelsId: number;

  @belongsTo(() => Dong)
  dongId: number;

  constructor(data?: Partial<BillList>) {
    super(data);
  }
}

export interface BillListRelations {}

export type BillListWithRelations = BillList & BillListRelations;
