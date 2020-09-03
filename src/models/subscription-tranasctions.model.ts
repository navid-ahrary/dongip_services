import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
  Model,
} from '@loopback/repository';
import {Users} from './users.model';

@model({
  name: 'subscription_transactions',
  settings: {
    foreignKeys: {
      fkCheckoutsUserId: {
        name: 'fk_subscription_transactions_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class SubscriptionTransactions extends Entity {
  @property({
    type: 'string',
    id: true,
    required: true,
    generated: false,
    mysql: {
      columnName: 'wc_transaction_key',
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'N',
    },
  })
  wcTransactionKey: string;

  @belongsTo(
    () => Users,
    {keyTo: 'userId', name: 'user', type: RelationType.belongsTo},
    {
      type: 'string',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint',
        nullabe: 'N',
      },
    },
  )
  userId: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {minLength: 3, maxLength: 3},
    mysql: {dataType: 'varchar', dataLength: 3, nullable: 'N'},
  })
  plan: string;

  @property({
    type: 'number',
    required: true,
    mysql: {dataType: 'int', nullable: 'N'},
  })
  price: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {maxLength: 10},
    mysql: {
      dataType: 'varchar',
      dataLength: 10,
      nullable: 'N',
    },
  })
  status: string;

  @property({
    type: 'number',
    required: true,
    mysql: {
      columnName: 'verify_ref_id',
      dataType: 'bigint',
      nullable: 'N',
    },
  })
  verifyRefId: number;

  @property({
    type: 'date',
    default: 'now',
    required: true,
    mysql: {
      columnName: 'created_at',
      dataType: 'datetime',
      nullable: 'N',
    },
  })
  createdAt: string;

  constructor(data?: Partial<SubscriptionTransactions>) {
    super(data);
  }
}

export interface SubscriptionTransactionsRelations {}

export type SubscriptionTransactionsWithRelations = SubscriptionTransactions &
  SubscriptionTransactionsRelations;

@model()
export class SubscTxReport extends Model {
  @property({type: 'string', required: false}) phone?: string;
  @property({type: 'string', required: false}) email?: string;
  @property({type: 'string', required: true}) transactionKey: string;
  @property({type: 'string', required: true}) sku: string;
  @property({type: 'string', required: true}) price: string;
}
