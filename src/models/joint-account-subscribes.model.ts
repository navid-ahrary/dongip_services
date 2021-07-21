import { Entity, model, property, belongsTo, RelationType } from '@loopback/repository';
import { JointAccounts, JointAccountsWithRelations } from './joint-accounts.model';
import { UsersWithRelations, Users } from './users.model';

@model({
  name: 'joint_account_subscribes',
  settings: {
    scope: {
      where: { deleted: false },
    },
    foreignKeys: {
      fkJointAccountSubscribeJointAccountId: {
        name: 'fk_joint_account_subscribe_joint_account_id',
        entity: 'joint_accounts',
        entityKey: 'id',
        foreignKey: 'jointAccountId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkJointAccountSubscribeUserId: {
        name: 'fk_joint_account_subscribe_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class JointAccountSubscribes extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
      nullable: 'N',
    },
  })
  jointAccountSubscribeId?: number;

  @belongsTo(
    () => JointAccounts,
    {
      name: 'jointAccount',
      keyFrom: 'jointAccountId',
      keyTo: 'jointAccountId',
      type: RelationType.belongsTo,
      source: JointAccounts,
      target: () => JointAccountSubscribes,
    },
    {
      type: 'number',
      required: true,
      index: { normal: true },
      mysql: {
        columnName: 'joint_account_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  jointAccountId: number;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      type: RelationType.belongsTo,
      source: Users,
      target: () => JointAccountSubscribes,
    },
    {
      type: 'number',
      required: true,
      index: { normal: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        nullable: 'N',
      },
    },
  )
  userId: number;

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

  constructor(data?: Partial<JointAccountSubscribes>) {
    super(data);
  }
}

export interface JointAccountSubscribesRelations {
  jointAccount: JointAccountsWithRelations;
  user: UsersWithRelations;
}

export type JointAccountSubscribesWithRelations = JointAccountSubscribes &
  JointAccountSubscribesRelations;
