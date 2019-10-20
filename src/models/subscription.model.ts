import {Entity, model, property, belongsTo} from '@loopback/repository';
import {v4 as uuid} from 'uuid';
import {Users} from './users.model';

@model()
export class Subscription extends Entity {
  @property({
    type: 'string',
    id: true,
    required: true,
    default: () => uuid(),
  })
  id: string;

  @property({
    type: 'date',
    required: true,
  })
  subscriptionDate: string;

  @belongsTo(() => Users)
  usersId?: string;

  constructor(data?: Partial<Subscription>) {
    super(data);
  }
}

export interface SubscriptionRelations {
  // describe navigational properties here
}

export type SubscriptionWithRelations = Subscription & SubscriptionRelations;
