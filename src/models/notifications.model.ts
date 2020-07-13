import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
} from '@loopback/repository';
import {Users} from './users.model';

@model({
  name: 'notifications',
  settings: {
    foreignKeys: {
      fkNotificationsUserId: {
        name: 'fk_notifications_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'restrict',
        onDelete: 'restrict',
      },
    },
  },
})
export class Notifications extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'int',
      dataLength: null,
      nullable: 'N',
    },
  })
  notifyId?: number;

  @property({
    type: 'date',
    required: true,
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
      dataLength: 50,
      nullable: 'Y',
    },
  })
  title: string;

  @property({
    type: 'string',
    required: true,
    mysql: {
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'Y',
    },
  })
  type: string;

  @property({
    type: 'string',
    jsonSchema: {maxLength: 255},
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
    required: true,
    mysql: {
      columnName: 'category_title',
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'N',
    },
  })
  categoryTitle: string;

  @property({
    type: 'number',
    required: true,
    mysql: {
      columnName: 'user_rel_id',
      dataLength: null,
      dataType: 'int',
      nullable: 'N',
    },
  })
  userRelId: number;

  @property({
    type: 'number',
    required: true,
    mysql: {
      columnName: 'dong_id',
      dataLength: null,
      dataType: 'int',
      nullable: 'N',
    },
  })
  dongId: number;

  @property({
    type: 'Number',
    required: true,
    mysql: {
      columnName: 'dong_amount',
      dataLength: null,
      dataType: 'bigint',
      nullable: 'N',
    },
  })
  dongAmount: number;

  @property({
    type: 'string',
    required: true,
  })
  body: string;

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

  constructor(data?: Partial<Notifications>) {
    super(data);
  }
}

export interface NotificationsRelations {}

export type NotificationsWithRelations = Notifications & NotificationsRelations;
