import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Users} from './users.model';

@model({name: 'subscriptions'})
export class Subscriptions extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint',
      dataLength: null,
      nullable: 'N',
    },
  })
  subscriptionId?: number;

  @property({
    type: 'date',
    required: true,
    mysql: {
      columnName: 'sol',
      dataType: 'datetime',
      dataLength: null,
      nullable: 'N',
    },
  })
  sol: string;

  @property({
    type: 'date',
    required: true,
    default: 'now',
    mysql: {
      columnName: 'eol',
      dataType: 'datetime',
      dataLength: null,
      nullable: 'N',
    },
  })
  eol: string;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      source: Users,
      target: () => Subscriptions,
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

  constructor(data?: Partial<Subscriptions>) {
    super(data);
  }
}

export interface SubscriptionsRelations {
  // describe navigational properties here
}

export type SubscriptionsWithRelations = Subscriptions & SubscriptionsRelations;
