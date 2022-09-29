import { belongsTo, Entity, hasMany, model, property } from '@loopback/repository';
import { GroupParticipants } from './group-participants.model';
import { Users } from './users.model';

@model({
  name: 'groups',
  settings: {
    foreignKeys: {
      fkGroupsUserId: {
        name: 'fk_groups_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class Groups extends Entity {
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
  groupId: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: { maxLength: 100 },
    mysql: {
      dataType: 'varchar',
      dataLength: 100,
      nullable: 'N',
    },
  })
  title: string;

  @property({
    type: 'string',
    jsonSchema: { maxLength: 255 },
    mysql: {
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'Y',
    },
  })
  desc?: string;

  @belongsTo(
    () => Users,
    { name: 'user' },
    {
      type: 'number',
      required: true,
      index: { normal: true },
      mysql: {
        dataType: 'mediumint unsigned',
        columnName: 'user_id',
        dataLength: null,
        nullable: 'N',
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

  @hasMany(() => GroupParticipants, { keyTo: 'groupId' })
  groupParticipants: GroupParticipants[];

  constructor(data?: Partial<Groups>) {
    super(data);
  }
}

export interface GroupsRelations {
  // describe navigational properties here
}

export type GroupsWithRelations = Groups & GroupsRelations;
