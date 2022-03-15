import { belongsTo, model, property } from '@loopback/repository';
import { Accounts } from './accounts.model';
import { BaseEntity } from './base-entity.model';
import { Users } from './users.model';

@model({
  name: 'messages',
  settings: {
    foreignKeys: {
      fkMessagesUserId: {
        name: 'fk_messages_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class Messages extends BaseEntity {
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
  messageId: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 1,
      maxLength: 10000,
    },
    mysql: {
      dataType: 'varchar',
      dataLength: 10000,
      nullable: 'N',
    },
  })
  message: string;

  @property({
    type: 'boolean',
    required: true,
    mysql: {
      columnName: 'is_question',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  isQuestion: boolean;

  @property({
    type: 'boolean',
    required: true,
    mysql: {
      columnName: 'is_answer',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  isAnswer: boolean;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      source: Users,
      target: () => Messages,
    },
    {
      type: 'number',
      required: true,
      index: { normal: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  userId: number;

  @property({
    type: 'boolean',
    default: false,
    mysql: {
      dataType: 'tinyint',
      dataLength: 1,
      default: 0,
      nullable: 'Y',
    },
  })
  closed: boolean;

  @belongsTo(() => Accounts)
  accountId: number;

  constructor(data?: Partial<Messages>) {
    super(data);
  }
}

export interface MessagesRelations {
  // describe navigational properties here
}

export type MessagesWithRelations = Messages & MessagesRelations;
