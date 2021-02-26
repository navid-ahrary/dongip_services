import { Entity, model, property } from '@loopback/repository';

@model({ name: 'black_list', settings: { mysql: { engine: 'aria' } } })
export class Blacklist extends Entity {
  @property({
    type: 'string',
    required: true,
    id: true,
    mysql: {
      dataType: 'varchar',
      dataLength: 250,
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
      default: 'now',
      nullable: 'N',
    },
  })
  createdAt?: string;

  constructor(data?: Partial<Blacklist>) {
    super(data);
  }
}

export interface BlacklistRelations {}

export type BlacklistWithRelations = Blacklist & BlacklistRelations;
