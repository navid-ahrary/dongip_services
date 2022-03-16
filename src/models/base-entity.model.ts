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
      default: 'now',
      nullable: 'N',
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
      dataType: 'bit',
      default: 0,
      nullable: 'N',
    },
  })
  deleted: boolean;

  constructor(data?: Partial<BaseEntity>) {
    super(data);
  }
}

export interface BaseEntityRelations {}

export type BaseEntityWithRelations = BaseEntity & BaseEntityRelations;
