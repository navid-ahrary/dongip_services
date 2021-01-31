import { Entity, model, property, belongsTo, RelationType } from '@loopback/repository';
import { Users } from './users.model';

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
export class Reminders extends Entity {
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
      columnName: 'title',
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
      columnName: 'desc',
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'Y',
    },
  })
  desc?: string;

  @property({
    type: 'string',
    required: false,
    jsonSchema: {
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
    },
    mysql: {
      dataType: 'varchar',
      dataLength: 10,
      nullable: 'Y',
    },
  })
  period?: string;

  @property({
    type: 'boolean',
    required: false,
    mysql: {
      dataType: 'tinyint',
      dataLength: '1',
      nullable: 'Y',
    },
  })
  repeat?: boolean;

  @property({
    type: 'string',
    required: false,
    jsonSchema: { maxLength: 10 },
    mysql: {
      dataType: 'varchar',
      dataLength: 10,
      nullable: 'Y',
    },
  })
  time?: string;

  @property({
    type: 'string',
    required: false,
    jsonSchema: { maxLength: 20 },
    mysql: {
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'Y',
    },
  })
  amount?: string;

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

  @property({
    type: 'date',
    defaultFn: 'now',
    mysql: {
      columnName: 'created_at',
      dataType: 'timestamp',
      default: 'now',
      nullable: 'Y',
    },
  })
  createdAt: string;

  constructor(data?: Partial<Reminders>) {
    super(data);
  }
}

export interface RemindersRelations {}

export type RemindersWithRelations = Reminders & RemindersRelations;
