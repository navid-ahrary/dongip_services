import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
  Model,
} from '@loopback/repository';
import {Users} from './users.model';

@model({
  name: 'checkouts',
  settings: {
    foreignKeys: {
      fkCheckoutsUserId: {
        name: 'fk_checkouts_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'no action',
      },
    },
  },
})
export class Checkouts extends Entity {
  @property({
    type: 'number',
    id: true,
    required: true,
    generated: false,
    mysql: {
      dataType: 'bigint',
      nullable: 'N',
    },
  })
  authority: number;

  @belongsTo(
    () => Users,
    {keyTo: 'userId', name: 'user', type: RelationType.belongsTo},
    {
      type: 'string',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint',
        nullabe: 'N',
      },
    },
  )
  userId: number;

  @property({
    type: 'string',
    required: true,
    index: {normal: true},
    jsonSchema: {minLength: 10, maxLength: 20},
    mysql: {dataLength: 20, nullable: 'N'},
  })
  phone: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {minLength: 3, maxLength: 30},
    mysql: {
      dataType: 'varchar',
      dataLength: 30,
      nullable: 'N',
    },
  })
  name: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {minLength: 3, maxLength: 3},
    mysql: {dateaLength: 3, nullable: 'N'},
  })
  plan: string;

  @property({
    type: 'number',
    required: true,
    mysql: {dataType: 'int', nullable: 'N'},
  })
  amount: number;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'gateway_url',
      dataType: 'varchar',
      dataLength: 200,
      nullable: 'N',
    },
  })
  gatewayUrl: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {maxLength: 10},
    mysql: {
      dataType: 'varchar',
      dataLength: 10,
      nullable: 'N',
    },
  })
  status: string;

  @property({
    type: 'number',
    mysql: {
      columnName: 'verify_ref_id',
      dataType: 'bigint',
      nullable: 'Y',
    },
  })
  verifyRefId: number;

  constructor(data?: Partial<Checkouts>) {
    super(data);
  }
}

export interface CheckoutsRelations {}

export type CheckoutsWithRelations = Checkouts & CheckoutsRelations;

@model()
export class CheckoutsRequest extends Model {
  @property({type: 'string', required: true}) phone: string;
  @property({type: 'string', required: true}) plan: string;
}
