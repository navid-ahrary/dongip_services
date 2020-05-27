import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Dong} from './dong.model';
import {UsersRels} from './users-rels.model';

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

  @belongsTo(() => Dong)
  dongId: number;

  @belongsTo(() => UsersRels)
  usersRelsId: number;

  constructor(data?: Partial<PayerList>) {
    super(data);
  }
}

export interface PayerListRelations {
  // describe navigational properties here
}

export type PayerListWithRelations = PayerList & PayerListRelations;
