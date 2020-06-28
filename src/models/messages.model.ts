import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Tickets} from './tickets.model';
import {Users} from './users.model';

@model({name: 'messages'})
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
    jsonSchema: {maxLength: 512},
    mysql: {
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'N',
    },
  })
  message: string;

  @property({
    type: 'boolean',
    required: true,
    mysql: {
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  question: boolean;

  @property({
    type: 'boolean',
    required: true,
    mysql: {
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  answer: boolean;

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
      name: 'ticket',
      keyFrom: 'ticketId',
      keyTo: 'ticketId',
      source: Tickets,
      target: () => Messages,
    },
    {
      type: 'Number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'ticket_id',
        dataType: 'int',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  ticketId: number;

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
