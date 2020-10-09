import {Entity, model, property, belongsTo} from '@loopback/repository';

import {JointAccounts} from './joint-accounts.model';
import {Users} from './users.model';

@model({name: 'joint_subscribe'})
export class JointSubscribe extends Entity {
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

  constructor(data?: Partial<JointSubscribe>) {
    super(data);
  }
}

export interface JointSubscribeRelations {
  // describe navigational properties here
}

export type JointSubscribeWithRelations = JointSubscribe &
  JointSubscribeRelations;
