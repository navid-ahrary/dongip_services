import {Entity, model, property} from '@loopback/repository';

@model({name: 'black_list'})
export class Blacklist extends Entity {
  @property({
    type: 'string',
    required: true,
    id: true,
    mysql: {
      dataType: 'varchar',
      dataLength: null,
      nullable: 'N',
    },
  })
  token: string;

  @property({
    type: 'date',
    required: false,
    mysql: {
      columnName: 'created_at',
      dataType: 'datetime',
      dataLength: null,
      nullable: 'N',
    },
  })
  createdAt: string = new Date().toISOString();

  constructor(data?: Partial<Blacklist>) {
    super(data);
  }
}

export interface BlacklistRelations {}

export type BlacklistWithRelations = Blacklist & BlacklistRelations;
