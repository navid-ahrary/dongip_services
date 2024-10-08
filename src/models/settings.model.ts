import { belongsTo, model, property, RelationType } from '@loopback/repository';
import { BaseEntity } from './base-entity.model';
import { Users, UsersWithRelations } from './users.model';



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
export class Settings extends BaseEntity {
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
    },
    mysql: {
      dataType: 'varchar',
      dataLength: 3,
      nullable: 'N',
    },
  })
  currency:string

  @property({
    type: 'boolean',
    required: false,
    default: false,
    mysql: {
      columnName: 'sms_enabled',
      dataType: 'tinyint',
      dataLength: 1,
      default: 0,
      nullable: 'Y',
    },
  })
  smsEnabled?: boolean;

  @property({
    type: 'boolean',
    required: false,
    default: true,
    mysql: {
      columnName: 'show_categories_in_home_age',
      dataType: 'tinyint',
      dataLength: 1,
      default: 1,
      nullable: 'Y',
    },
  })
  showCategoriesInHomePage?: boolean;

  @property({
    type: 'boolean',
    required: false,
    default: false,
    mysql: {
      columnName: 'show_budgets_in_home_age',
      dataType: 'tinyint',
      dataLength: 1,
      default: 0,
      nullable: 'Y',
    },
  })
  showBudgetsInHomePage?: boolean;

  @property({
    type: 'boolean',
    required: false,
    default: true,
    mysql: {
      columnName: 'show_friends_in_home_age',
      dataType: 'tinyint',
      dataLength: 1,
      default: 1,
      nullable: 'Y',
    },
  })
  showFriendsInHomePage?: boolean;

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
