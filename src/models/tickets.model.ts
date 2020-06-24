import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Users} from './users.model';

@model({name: 'tickets'})
export class Tickets extends Entity {
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
  ticketId: number;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'ticket_message',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'N',
    },
  })
  ticketMessage: string;

  @property({
    type: 'date',
    requried: false,
    mysql: {
      columnName: 'asked_at',
      dataType: 'datetime',
      nullable: 'N',
    },
  })
  askedAt: string = new Date().toISOString();

  @property({
    type: 'string',
    mysql: {
      columnName: 'response_message',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'Y',
    },
  })
  responseMessage?: string;

  @property({
    type: 'date',
    mysql: {
      columnName: 'respond_at',
      dataType: 'datetime',
      nullable: 'Y',
    },
  })
  respondAt?: string;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      source: Users,
      target: () => Tickets,
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

  constructor(data?: Partial<Tickets>) {
    super(data);
  }
}

export interface TicketsRelations {}

export type TicketsWithRelations = Tickets & TicketsRelations;
