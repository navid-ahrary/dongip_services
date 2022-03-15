import { Entity, model, property } from '@loopback/repository';

@model()
export class BaseEntity extends Entity {
  @property({
    type: 'date',
    required: true,
    defaultFn: 'now',
    mysql: {
      columnName: 'created_at',
      dataType: 'timestamp',
      nullable: 'N',
      default: 'now',
    },
  })
  createdAt: string;

  @property({
    type: 'boolean',
    default: false,
    required: true,
    hidden: true,
    index: { normal: true },
    mysql: {
      dataType: 'tinyint',
      dataLength: 1,
      default: 0,
      nullable: 'N',
    },
  })
  deleted: boolean;

  constructor(data?: Partial<BaseEntity>) {
    super(data);
  }
}

export interface BaseEntityRelations {
  // describe navigational properties here
}

export type BaseEntityWithRelations = BaseEntity & BaseEntityRelations;
