import { Entity, model, property } from '@loopback/repository';

export enum LoginStrategy {
  GOOGLE = 'google',
  EMAIL = 'email',
  PHONE = 'phone',
}

@model({ name: 'verify' })
export class Verify extends Entity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'int unsigned',
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
    jsonSchema: { maxLength: 20 },
    mysql: {
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'Y',
    },
  })
  phone?: string;

  @property({
    type: 'string',
    jsonSchema: { maxLength: 100 },
    mysql: {
      dataType: 'varchar',
      dataLength: 100,
      nullable: 'Y',
    },
  })
  email?: string;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'user_agent',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'N',
    },
  })
  userAgent: string;

  @property({
    type: 'string',
    required: true,
    default: 'and',
    jsonSchema: { minLength: 3, maxLength: 20 },
    mysql: {
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'N',
    },
  })
  platform: string;

  @property({
    type: 'string',
    mysql: {
      dataType: 'varchar',
      dataLength: 5,
      nullable: 'Y',
    },
  })
  region?: string;

  @property({
    type: 'string',
    required: false,
    mysql: {
      columnName: 'sms_signature',
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'Y',
    },
  })
  smsSignature: string;

  @property({
    type: 'boolean',
    default: false,
    mysql: {
      columnName: 'logged_in',
      dataType: 'tinyint',
      nullable: 'N',
    },
  })
  loggedIn: boolean;

  @property({
    type: 'string',
    required: false,
    default: 'phone',
    jsonSchema: {
      enum: Object.values(LoginStrategy),
    },
    mysql: {
      columnName: 'login_strategy',
      dataType: 'varchar',
      dataLength: 10,
      nullable: 'N',
    },
  })
  loginStrategy: 'google' | 'phone' | 'email';

  @property({
    type: 'date',
    mysql: {
      columnName: 'logged_in_at',
      dataType: 'datetime',
      nullable: 'Y',
    },
  })
  loggedInAt?: string;

  @property({
    type: 'date',
    required: true,
    defaultFn: 'now',
    mysql: {
      columnName: 'created_at',
      dataType: 'datetime',
      nullable: 'N',
    },
  })
  createdAt: string;

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
      dataType: 'smallint',
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

  @property({
    type: 'number',
    mysql: {
      columnName: 'kavenegar_cost',
      dataType: 'smallint',
      dataLength: 5,
      nullable: 'Y',
    },
  })
  kavenegarCost?: number;

  @property({
    type: 'string',
    mysql: {
      columnName: 'email_message_id',
      dataType: 'varchar',
      dataLength: 100,
      nullable: 'Y',
    },
  })
  emailMessageId?: string;

  @property({
    type: 'string',
    mysql: {
      columnName: 'email_status_text',
      dataType: 'varchar',
      dataLength: 100,
      nullable: 'Y',
    },
  })
  emailStatusText?: string;

  @property({
    type: 'string',
    mysql: {
      columnName: 'ip_address',
      dataType: 'varchar',
      dataLength: 30,
      nullable: 'Y',
    },
  })
  ipAddress?: string;

  constructor(data?: Partial<Verify>) {
    super(data);
  }
}

export interface VerifyRelations {}

export type VerifyWithRelations = Verify & VerifyRelations;
