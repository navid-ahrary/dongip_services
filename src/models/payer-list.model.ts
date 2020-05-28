import {Entity, model, property, belongsTo} from '@loopback/repository';
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
  id?: number;

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

  @belongsTo(() => Dong)
  dongId: number;

  @belongsTo(() => UsersRels)
  usersRelsId: number;

  @belongsTo(() => Category)
  categoryId: number;

  @belongsTo(() => Users, {name: 'user'})
  belongsToUserId: number;

  constructor(data?: Partial<PayerList>) {
    super(data);
  }
}

export interface PayerListRelations {
  // describe navigational properties here
}

export type PayerListWithRelations = PayerList & PayerListRelations;
