import { Entity, model, property, belongsTo, RelationType } from '@loopback/repository';

import { Users, UsersWithRelations } from './users.model';

export enum CurrencyEnum {
  IRAN_RIAL = 'IRR',
  IRAN_TOMAN = 'IRT',
  DUBAI_DIRHAM = 'AED',
  US_DOLLAR = 'USD',
  EUROPE_EURO = 'EUR',
}

export enum LanguageEnum {
  FARSI = 'fa',
  ENGLISH = 'en',
}

@model({
  name: 'settings',
  settings: {
    foreignKeys: {
      fkSettingsUserId: {
        name: 'fk_settings_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
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
      dataType: 'mediumint unsigned',
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
    type: 'string',
    required: true,
    default: 'fa',
    jsonSchema: {
      minLength: 2,
      maxLength: 2,
      description: 'ISO 639-1',
      enum: Object.values(LanguageEnum),
    },
    mysql: {
      dataType: 'varchar',
      dataLength: 2,
      nullable: 'N',
    },
  })
  language: string;

  @property({
    type: 'string',
    default: 'IRT',
    jsonSchema: {
      minLength: 3,
      maxLength: 3,
      description: 'ISO 4217',
      enum: Object.values(CurrencyEnum),
    },
    mysql: {
      dataType: 'varchar',
      dataLength: 3,
      nullable: 'N',
    },
  })
  currency: string;

  @property({
    type: 'date',
    required: true,
    defaultFn: 'now',
    mysql: { columnName: 'created_at', dataType: 'datetime', nullable: 'N' },
  })
  createdAt: string;

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
      type: 'number',
      required: true,
      index: { unique: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
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
  user?: UsersWithRelations;
}

export type SettingsWithRelations = Settings & SettingsRelations;
