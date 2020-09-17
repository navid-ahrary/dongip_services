import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Users} from './users.model';

@model({
  name: 'messages',
  settings: {
    foreignKeys: {
      // fkMessagesUserId: {
      //   name: 'fk_messages_user_id',
      //   entity: 'users',
      //   entityKey: 'id',
      //   foreignKey: 'userId',
      //   onUpdate: 'cascade',
      //   onDelete: 'cascade',
      // },
    },
  },
})
export class Messages extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    mysql: {
      columnName: 'message_id',
      dataType: 'mediumint unsigned',
      dataLength: 8,
    },
  })
  messageId: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {minLength: 1, maxLength: 5000},
    mysql: {dataType: 'varchar', dataLength: 5000, nullable: 'N'},
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

  @property({
    type: 'date',
    required: true,
    mysql: {
      columnName: 'created_at',
      dataType: 'timestamp',
      nullable: 'N',
      deafult: 'now',
    },
  })
  createdAt: string;

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
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        nullable: 'N',
      },
    },
  )
  userId: number;

  constructor(data?: Partial<Messages>) {
    super(data);
  }
}

export interface MessagesRelations {
  // describe navigational properties here
}

export type MessagesWithRelations = Messages & MessagesRelations;
