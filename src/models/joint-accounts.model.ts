import {Entity, model, property} from '@loopback/repository';

@model({name: 'joint_accounts'})
export class JointAccounts extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    required: false,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
      nullable: 'N',
    },
  })
  jointAccountId: number;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'title',
      dataLength: '20',
      dataType: 'varchar',
      nullable: 'N',
    },
  })
  title: string;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'description',
      dataLength: '100',
      dataType: 'varchar',
      nullable: 'Y',
    },
  })
  description: string;

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

  constructor(data?: Partial<JointAccounts>) {
    super(data);
  }
}

export interface JointAccountsRelations {
  // describe navigational properties here
}

export type JointAccountsWithRelations = JointAccounts & JointAccountsRelations;
