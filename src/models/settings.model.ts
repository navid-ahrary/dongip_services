import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
} from '@loopback/repository';
import {Users} from './users.model';

@model({
  name: 'settings',
  settings: {
    foreignKeys: {
      fkSettingsUserId: {
        name: 'fk_settings_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'restrict',
        onDelete: 'cascade',
      },
    },
  },
})
export class Settings extends Entity {
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
  settingId?: number;

  @property({
    type: 'boolean',
    required: true,
    default: true,
    mysql: {
      columnName: 'dongs_notify',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  dongsNotify: boolean;

  @property({
    type: 'boolean',
    required: true,
    default: true,
    mysql: {
      columnName: 'news_notify',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  newsNotify: boolean;

  @property({
    type: 'boolean',
    required: true,
    default: true,
    mysql: {
      columnName: 'lotteries_notify',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  lotteriesNotify: boolean;

  @property({
    type: 'boolean',
    required: true,
    default: true,
    mysql: {
      columnName: 'user_rel_notify',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  userRelNotify: boolean;

  @property({
    type: 'boolean',
    required: true,
    default: true,
    mysql: {
      columnName: 'budgets_notify',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  budgetsNotify: boolean;

  @property({
    type: 'boolean',
    required: true,
    default: true,
    mysql: {
      columnName: 'schedule_notify',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  scheduleNotify: boolean;

  @property({
    type: 'string',
    default: '17:00:00',
    required: true,
    length: 8,
    mysql: {
      columnName: 'schedule_time',
      dataType: 'time',
      dataLength: 6,
      nullable: 'N',
    },
  })
  scheduleTime: string;

  @property({
    type: 'date',
    required: true,
    defaultFn: 'now',
    mysql: {columnName: 'created_at', dataType: 'datetime', nullable: 'N'},
  })
  createdAt: string;

  @property({
    type: 'date',
    required: true,
    defaultFn: 'now',
    mysql: {columnName: 'updated_at', dataType: 'datetime', nullable: 'N'},
  })
  updatedAt: string;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      type: RelationType.belongsTo,
      source: Users,
      target: () => Settings,
    },
    {
      type: 'Number',
      required: true,
      index: {unique: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  userId: number;

  constructor(data?: Partial<Settings>) {
    super(data);
  }
}

export interface SettingsRelations {
  // describe navigational properties here
}

export type SettingsWithRelations = Settings & SettingsRelations;
