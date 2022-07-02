import { model, property } from '@loopback/repository';
import { BaseEntity } from './base-entity.model';

@model({ name: 'black_list', settings: { mysql: { engine: 'aria' } } })
export class Blacklist extends BaseEntity {
  @property({
    type: 'string',
    required: true,
    id: true,
    mysql: {
      dataType: 'varchar',
      dataLength: 500,
      nullable: 'N',
    },
  })
  token: string;

  constructor(data?: Partial<Blacklist>) {
    super(data);
  }
}

export interface BlacklistRelations {}

export type BlacklistWithRelations = Blacklist & BlacklistRelations;
