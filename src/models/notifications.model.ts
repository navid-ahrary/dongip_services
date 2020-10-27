import { Entity, model, property, belongsTo, RelationType } from '@loopback/repository';
import { Users } from './users.model';

@model({
  name: 'notifications',
  settings: {
    foreignKeys: {
      fkNotificationsUserId: {
        name: 'fk_notifications_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class Notifications extends Entity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'bigint unsigned',
      nullable: 'N',
    },
  })
  notifyId: number;

  @property({
    type: 'date',
    required: true,
    defaultFn: 'now',
    mysql: {
      columnName: 'created_at',
      dataType: 'datetime',
      dataLength: null,
      nullable: 'N',
    },
  })
  createdAt: string;

  @property({
    type: 'string',
    required: true,
    mysql: {
      dataType: 'varchar',
      dataLength: 200,
      nullable: 'N',
    },
  })
  title: string;

  @property({
    type: 'string',
    mysql: {
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'Y',
    },
  })
  type: string;

  @property({
    type: 'string',
    jsonSchema: { maxLength: 255 },
    mysql: {
      columnName: 'desc',
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'Y',
    },
  })
  desc?: string;

  @property({
    type: 'string',
    mysql: {
      columnName: 'category_title',
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'Y',
    },
  })
  categoryTitle?: string;

  @property({
    type: 'string',
    mysql: {
      columnName: 'category_icon',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'Y',
    },
  })
  categoryIcon?: string;

  @property({
    type: 'number',
    mysql: {
      columnName: 'user_rel_id',
      dataLength: null,
      dataType: 'mediumint unsigned',
      nullable: 'Y',
    },
  })
  userRelId?: number;

  @property({
    type: 'number',
    mysql: {
      columnName: 'dong_id',
      dataLength: null,
      dataType: 'mediumint unsigned',
      nullable: 'Y',
    },
  })
  dongId?: number;

  @property({
    type: 'number',
    mysql: {
      columnName: 'dong_amount',
      dataLength: null,
      dataType: 'bigint unsigned',
      nullable: 'Y',
    },
  })
  dongAmount?: number;

  @property({
    type: 'string',
    default: 'IRR',
    jsonSchema: {
      minLength: 3,
      maxLength: 3,
      description: 'ISO 4217',
    },
    mysql: {
      dataType: 'varchar',
      dataLength: 3,
      nullable: 'Y',
    },
  })
  currency?: string;

  @property({
    type: 'string',
    required: true,
  })
  body: string;

  @property({
    type: 'string',
    mysql: {
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'Y',
    },
  })
  name?: string;

  @property({
    type: 'string',
    jsonSchema: { minLength: 12, maxLength: 20 },
    mysql: {
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'Y',
    },
  })
  phone?: string;

  @property({
    type: 'string',
    mysql: {
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'Y',
    },
  })
  avatar?: string;

  @property({
    type: 'number',
    mysql: {
      columnName: 'subscription_id',
      dataType: 'int unsigned',
      dataLength: null,
      nullable: 'Y',
    },
  })
  subscriptionId?: number;

  @property({
    type: 'date',
    mysql: {
      columnName: 'sol_time',
      dataType: 'datetime',
      dataLength: null,
      nullable: 'Y',
    },
  })
  solTime?: string;

  @property({
    type: 'date',
    mysql: {
      columnName: 'eol_time',
      dataType: 'datetime',
      dataLength: null,
      nullable: 'Y',
    },
  })
  eolTime?: string;

  @property({
    type: 'string',
    jsonSchema: { maxLength: 10 },
    mysql: {
      columnName: 'plan_id',
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'Y',
    },
  })
  planId: string;

  @property({
    type: 'number',
    jsonSchema: { maxLength: 10 },
    mysql: {
      columnName: 'joint_account_id',
      dataType: 'mediumint unsigned',
      nullable: 'Y',
    },
  })
  jointAccountId: number;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      source: Users,
      target: () => Notifications,
      type: RelationType.belongsTo,
    },
    {
      type: 'number',
      index: { normal: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        nullable: 'Y',
      },
    },
  )
  userId: number;

  constructor(data?: Partial<Notifications>) {
    super(data);
  }
}

export interface NotificationsRelations {}

export type NotificationsWithRelations = Notifications & NotificationsRelations;
