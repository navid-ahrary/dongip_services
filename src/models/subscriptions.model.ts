import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Users} from './users.model';

@model({
  name: 'subscriptions',
  settings: {
    foreignKeys: {
      fkSettingsUserId: {
        name: 'fk_subscriptions_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
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
  subscriptionId: number;

  @property({
    type: 'date',
    required: true,
    defaultFn: 'now',
    mysql: {
      columnName: 'sol_time',
      dataType: 'datetime',
      default: 'now',
      nullable: 'N',
    },
  })
  solTime: string;

  @property({
    type: 'date',
    required: true,
    default: 'now',
    mysql: {
      columnName: 'eol_time',
      dataType: 'datetime',
      dataLength: null,
      nullable: 'N',
    },
  })
  eolTime: string;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'plan_id',
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'N',
    },
  })
  planId: string;

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
