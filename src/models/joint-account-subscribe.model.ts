import {Entity, model, property, belongsTo} from '@loopback/repository';

import {JointAccounts} from './joint-accounts.model';
import {Users} from './users.model';

@model({
  name: 'joint_account_subscribe',
  settings: {
    foreignKeys: {
      fkJointSubscribeJointAccountId: {
        name: 'fk_joint_account_subscribe_joint_account_id',
        entity: 'joint_accounts',
        entityKey: 'id',
        foreignKey: 'jointAccountId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkJointSubscribeUserId: {
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
export class JointAccountSubscribe extends Entity {
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
  jointSubscriberId: number;

  @belongsTo(
    () => JointAccounts,
    {name: 'jointAccount'},
    {
      type: 'number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'joint_account_id',
        dataType: 'mediumint unsigned',
        nullable: 'N',
      },
    },
  )
  jointAccountId: number;

  @belongsTo(
    () => Users,
    {name: 'user'},
    {
      type: 'number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        nullable: 'N',
      },
    },
  )
  userId: number;

  constructor(data?: Partial<JointAccountSubscribe>) {
    super(data);
  }
}

export interface JointAccountSubscribeRelations {
  jointAccount?: JointAccounts;
  user?: Users;
}

export type JointAccountSubscribeWithRelations = JointAccountSubscribe &
  JointAccountSubscribeRelations;
