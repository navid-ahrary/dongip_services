import { belongsTo, Entity, model, property } from '@loopback/repository';
import { Groups } from './groups.model';
import { Users } from './users.model';

@model({
  name: 'group_participants',
  settings: {
    foreignKeys: {
      fkGroupParticipantsUserId: {
        name: 'fk_group_partitcipants_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkGroupParticipantsGroupId: {
        name: 'fk_group_partitcipants_group_id',
        entity: 'groups',
        entityKey: 'id',
        foreignKey: 'groupId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class GroupParticipants extends Entity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      dataType: 'mediumint unsigned',
      columnName: 'id',
    },
  })
  groupParticipantId: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: { maxLength: 50 },
    mysql: {
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'N',
    },
  })
  name: string;

  @belongsTo(
    () => Groups,
    { name: 'group' },
    {
      type: 'number',
      index: { normal: true },
      required: true,
      mysql: {
        dataType: 'mediumint unsigned',
        columnName: 'group_id',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  groupId: number;

  @belongsTo(
    () => Users,
    { name: 'user' },
    {
      type: 'number',
      index: { normal: true },
      mysql: {
        dataType: 'mediumint unsigned',
        columnName: 'user_id',
        dataLength: null,
        nullable: 'Y',
      },
    },
  )
  userId: number;

  @property({
    type: 'date',
    required: false,
    defaultFn: 'now',
    mysql: {
      dataType: 'timestamp',
      columnName: 'created_at',
      default: 'now',
      nullable: 'N',
    },
  })
  createdAt?: string;

  @property({
    type: 'boolean',
    default: false,
    required: true,
    hidden: true,
    index: { normal: true },
    mysql: {
      dataType: 'bit',
      default: 0,
      nullable: 'N',
    },
  })
  deleted: boolean;

  constructor(data?: Partial<GroupParticipants>) {
    super(data);
  }
}

export interface GroupParticipantsRelations {
  // describe navigational properties here
}

export type GroupParticipantsWithRelations = GroupParticipants & GroupParticipantsRelations;
