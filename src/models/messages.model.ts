import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Users} from './users.model';

@model({
  name: 'messages',
  settings: {
    // foreignKeys: {
    //   fkMessagesUserId: {
    //     name: 'fk_messages_user_id',
    //     entity: 'users',
    //     entityKey: 'id',
    //     foreignKey: 'userId',
    //     onUpdate: 'restrict',
    //     onDelete: 'restrict',
    //   },
    // },
  },
})
export class Messages extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'int',
      nullable: 'N',
    },
  })
  messageId: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {minLength: 3, maxLength: 2048},
    mysql: {dataType: 'varchar', dataLength: 2048, nullable: 'N'},
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
      dataType: 'datetime',
      dataLength: null,
      nullable: 'N',
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
      type: 'Number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'int',
        dataLength: null,
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
