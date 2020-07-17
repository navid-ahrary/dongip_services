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
    // foreignKeys: {
    //   fkNotificationsUserId: {
    //     name: 'fk_notifications_user_id',
    //     entity: 'users',
    //     entityKey: 'id',
    //     foreignKey: 'userId',
    //     onUpdate: 'restrict',
    //     onDelete: 'restrict',
    //   },
    // },
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
    mysql: {
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'Y',
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
    mysql: {
      columnName: 'category_title',
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'Y',
    },
  })
  categoryTitle?: string;

  @property({
    type: 'number',
    mysql: {
      columnName: 'user_rel_id',
      dataLength: null,
      dataType: 'int',
      nullable: 'Y',
    },
  })
  userRelId?: number;

  @property({
    type: 'number',
    mysql: {
      columnName: 'dong_id',
      dataLength: null,
      dataType: 'int',
      nullable: 'Y',
    },
  })
  dongId?: number;

  @property({
    type: 'Number',
    mysql: {
      columnName: 'dong_amount',
      dataLength: null,
      dataType: 'bigint',
      nullable: 'Y',
    },
  })
  dongAmount?: number;

  @property({
    type: 'string',
    required: true,
  })
  body: string;

  @property({
    type: 'string',
    required: true,
    mysql: {
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'Y',
    },
  })
  name?: string;

  @property({
    type: 'string',
    jsonSchema: {minLength: 12, maxLength: 20},
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
