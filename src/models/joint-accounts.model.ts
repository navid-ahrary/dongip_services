import { belongsTo, Entity, hasMany, model, property, RelationType } from '@loopback/repository';
import { Dongs } from './dongs.model';
import {
  JointAccountSubscribes,
  JointAccountSubscribesWithRelations,
} from './joint-account-subscribes.model';
import { Users } from './users.model';

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
      dataLength: '50',
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
      nullable: 'N',
      default: 'now',
    },
  })
  createdAt: string;

  @property({
    type: 'boolean',
    default: false,
    mysql: {
      columnName: 'family',
      dataType: 'tinyint',
      dataLength: 1,
      default: '0',
      nullable: 'N',
    },
  })
  family: boolean;

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
      index: { normal: true },
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
    name: 'jointAccountSubscribes',
    keyTo: 'jointAccountId',
    keyFrom: 'jointAccountId',
    targetsMany: true,
    type: RelationType.hasMany,
    source: JointAccounts,
    target: () => JointAccountSubscribes,
  })
  jointAccountSubscribes: JointAccountSubscribes[];

  @hasMany(() => Dongs, { keyTo: 'jointAccountId' })
  dongs: Dongs[];

  @property({
    type: 'boolean',
    default: false,
    required: true,
    hidden: true,
    mysql: {
      dataType: 'tinyint',
      dataLength: 1,
      default: 0,
      nullable: 'N',
    },
  })
  deleted: boolean;

  constructor(data?: Partial<JointAccounts>) {
    super(data);
  }
}

export interface JointAccountsRelations {
  jointAccountSubscribes?: JointAccountSubscribesWithRelations[];
}

export type JointAccountsWithRelations = JointAccounts & JointAccountsRelations;
