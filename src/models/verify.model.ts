import {Entity, model, property} from '@loopback/repository';

@model({name: 'verify'})
export class Verify extends Entity {
  @property({
    type: 'Number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'int',
      dataLength: null,
      nullable: 'N',
    },
  })
  verifyId: number;

  @property({
    type: 'string',
    required: true,
    mysql: {
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'N',
    },
  })
  password: string;

  @property({
    type: 'boolean',
    required: true,
    mysql: {
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  registered: boolean;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {maxLength: 20},
    mysql: {
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'N',
    },
  })
  phone: string;

  @property({
    type: 'date',
    required: true,
    mysql: {
      columnName: 'issued_at',
      dataType: 'datetime',
      dataLength: null,
      nullable: 'N',
    },
  })
  issuedAt: string;

  constructor(data?: Partial<Verify>) {
    super(data);
  }
}

export interface VerifyRelations {}

export type VerifyWithRelations = Verify & VerifyRelations;
