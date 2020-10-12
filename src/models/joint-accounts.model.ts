import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
  hasMany,
} from '@loopback/repository';
import {Users} from './users.model';
import {
  JointAccountSubscribes,
  JointAccountSubscribesWithRelations,
} from './joint-account-subscribes.model';
import {BillList, BillListWithRelations} from './bill-list.model';

@model({
  name: 'joint_accounts',
  settings: {
    foreignKeys: {
      fkNotificationsUserId: {
        name: 'fk_joint_accounts_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
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

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      type: RelationType.belongsTo,
      source: Users,
      target: () => JointAccounts,
    },
    {
      type: 'number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  userId: number;

  @hasMany(() => JointAccountSubscribes, {
    keyTo: 'jointAccountId',
    keyFrom: 'jointAccountId',
  })
  jointAccountSubscribes: JointAccountSubscribes[];

  @hasMany(() => BillList, {keyTo: 'jointAccountId', keyFrom: 'jointAccountId'})
  billList: BillList[];

  constructor(data?: Partial<JointAccounts>) {
    super(data);
  }
}

export interface JointAccountsRelations {
  jointAccountSubscribes?: JointAccountSubscribesWithRelations[];
  billList?: BillListWithRelations[];
}

export type JointAccountsWithRelations = JointAccounts & JointAccountsRelations;
