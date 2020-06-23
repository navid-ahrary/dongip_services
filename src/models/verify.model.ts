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
      dataLength: 10,
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

  @property({
    type: 'number',
    mysql: {
      columnName: 'kavenegar_message_id',
      dataType: 'int',
      dataLength: null,
      nullable: 'Y',
    },
  })
  kavenegarMessageId?: number;

  @property({
    type: 'string',
    mysql: {
      columnName: 'kavenegar_sender',
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'Y',
    },
  })
  kavenegarSender?: string;

  @property({
    type: 'Number',
    mysql: {
      columnName: 'kavenegar_date',
      dataType: 'int',
      dataLength: null,
      nullable: 'Y',
    },
  })
  kavenegarDate?: number;

  @property({
    type: 'number',
    mysql: {
      columnName: 'kavenegar_status_code',
      dataType: 'int',
      dataLength: 3,
      nullable: 'Y',
    },
  })
  kavenegarStatusCode?: number;

  @property({
    type: 'string',
    mysql: {
      columnName: 'kavenegar_status_text',
      dataType: 'varchar',
      dataLength: 100,
      nullable: 'Y',
    },
  })
  kavenegarStatusText?: string;

  constructor(data?: Partial<Verify>) {
    super(data);
  }
}

export interface VerifyRelations {}

export type VerifyWithRelations = Verify & VerifyRelations;
