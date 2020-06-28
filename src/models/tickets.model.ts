import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
} from '@loopback/repository';
import {Users} from './users.model';
import {Messages} from './messages.model';

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
    type: 'date',
    required: true,
    mysql: {
      columnName: 'created_at',
      dataType: 'datetime',
      nullable: 'N',
    },
  })
  createdAt: string;

  @property({
    type: 'date',
    mysql: {
      columnName: 'updated_at',
      dataType: 'datetime',
      nullable: 'Y',
    },
  })
  updatedAt?: string;

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

  @hasMany(() => Messages, {keyTo: 'ticketId'})
  messages: Messages[];

  constructor(data?: Partial<Tickets>) {
    super(data);
  }
}

export interface TicketsRelations {}

export type TicketsWithRelations = Tickets & TicketsRelations;
