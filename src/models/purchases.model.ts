import {
  model,
  property,
  Entity,
  belongsTo,
  RelationType,
} from '@loopback/repository';
import {Users} from './users.model';

@model({name: 'purchases'})
export class Purchases extends Entity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint',
    },
  })
  purchaseId: number;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'purchase_token',
      dataType: 'varchar',
      dataLength: 40,
      nullable: 'N',
    },
  })
  purchaseToken: string;

  @property({
    type: 'date',
    required: true,
    mysql: {
      columnName: 'purchased_at',
      dataType: 'bigint',
      nullable: 'N',
    },
  })
  purchasedAt: string;

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
      type: RelationType.belongsTo,
      source: Users,
      target: () => Purchases,
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

  constructor(data?: Partial<Purchases>) {
    super(data);
  }
}

export interface PurchasesRelations {}

export type PurchasesWithRelations = Purchases & PurchasesRelations;
