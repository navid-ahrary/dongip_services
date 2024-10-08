import { belongsTo, model, property, RelationType } from '@loopback/repository';
import { BaseEntity } from './base-entity.model';
import { Users, UsersWithRelations } from './users.model';

@model({
  name: 'reminders',
  settings: {
    foreignKeys: {
      fkRemindersUserId: {
        name: 'fk_reminders_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class Reminders extends BaseEntity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
    },
  })
  reminderId: number;

  @property({
    type: 'string',
    required: false,
    jsonSchema: { maxLength: 255 },
    mysql: {
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'Y',
    },
  })
  title?: string;

  @property({
    type: 'string',
    jsonSchema: { maxLength: 255 },
    mysql: {
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'Y',
    },
  })
  desc?: string;

  @property({
    type: 'number',
    required: false,
    jsonSchema: { minimum: 1 },
    mysql: {
      columnName: 'period_amount',
      dataType: 'tinyint',
      dataLength: 2,
      nullable: 'N',
    },
  })
  periodAmount: number;

  @property({
    type: 'string',
    required: false,
    default: 'month',
    jsonSchema: {
      enum: ['day', 'week', 'month', 'year'],
    },
    mysql: {
      columnName: 'period_unit',
      dataType: 'varchar',
      dataLength: 5,
      nullable: 'N',
    },
  })
  periodUnit: 'day' | 'week' | 'month' | 'year';

  @property({
    type: 'string',
    default: '08:00:00',
    required: false,
    length: 8,
    mysql: {
      columnName: 'notify_time',
      dataType: 'time',
      dataLength: 6,
      nullable: 'N',
    },
  })
  notifyTime: string;

  @property({
    type: 'string',
    mysql: {
      columnName: 'previous_notify_date',
      dataType: 'date',
      nullable: 'Y',
    },
  })
  previousNotifyDate: string;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'next_notify_date',
      dataType: 'date',
      nullable: 'Y',
    },
  })
  nextNotifyDate: string;

  @property({
    type: 'boolean',
    required: false,
    default: true,
    mysql: {
      dataType: 'tinyint',
      dataLength: '1',
      default: 1,
      nullable: 'N',
    },
  })
  repeat: boolean;

  @property({
    type: 'boolean',
    required: false,
    default: true,
    mysql: {
      dataType: 'tinyint',
      dataLength: '1',
      default: 1,
      nullable: 'N',
    },
  })
  enabled: boolean;

  @property({
    type: 'number',
    required: false,
    jsonSchema: { maximum: 999999999999 },
    mysql: {
      dataType: 'decimal(20,3) unsigned',
      nullable: 'Y',
    },
  })
  price?: number;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      type: RelationType.belongsTo,
      source: Users,
      target: () => Reminders,
    },
    {
      type: 'number',
      required: true,
      index: { normal: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        nullable: 'N',
      },
    },
  )
  userId: number;

  constructor(data?: Partial<Reminders>) {
    super(data);
  }
}

export interface RemindersRelations {
  user: UsersWithRelations;
}

export type RemindersWithRelations = Reminders & RemindersRelations;
