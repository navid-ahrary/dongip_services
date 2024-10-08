import { belongsTo, model, property, RelationType } from '@loopback/repository';
import { BaseEntity } from './base-entity.model';
import { Users } from './users.model';



@model({
  name: 'purchases',
  settings: {
    foreignKeys: {
      fkPayerListUserId: {
        name: 'fk_purchases_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'set null',
      },
    },
  },
})
export class Purchases extends BaseEntity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
    },
  })
  purchaseId: number;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'purchase_token',
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'N',
    },
  })
  purchaseToken: string;

  @property({
    type: 'date',
    required: true,
    mysql: {
      columnName: 'purchased_at',
      dataType: 'datetime',
      nullable: 'N',
    },
  })
  purchasedAt: string;

  @property({
    type: 'string',
    required: false,
    default: 'cafebazaar',
    jsonSchema: { default: 'cafebazaar' },
    mysql: {
      columnName: 'purchase_origin',
      dataType: 'varchar',
      dataLength: 11,
      nullable: 'N',
    },
  })
  purchaseOrigin: string;

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

  @property({
    type: 'number',
    mysql: {
      columnName: 'purchase_amount',
      dataType: 'mediumint unsigned',
      nullable: 'N',
    },
  })
  purchaseAmount?: number;

  @property({
    type: 'string',
    mysql: {
      dataType: 'varchar',
      dataLength: 3,
      nullable: 'N',
    },
  })
  currency?: string;

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
      type: 'number',
      index: { normal: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'Y',
      },
    },
  )
  userId?: number;

  constructor(data?: Partial<Purchases>) {
    super(data);
  }
}

export interface PurchasesRelations {}

export type PurchasesWithRelations = Purchases & PurchasesRelations;
