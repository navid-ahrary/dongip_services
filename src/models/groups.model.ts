import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
} from '@loopback/repository';
import {Users} from './users.model';
import {Dongs} from './dongs.model';
import {BillList} from './bill-list.model';
import {PayerList} from './payer-list.model';

@model({name: 'groups'})
export class Groups extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    mysql: {columnName: 'id', dataType: 'int', dataLength: null, nullable: 'N'},
  })
  groupId?: number;

  @property({
    type: 'string',
    required: true,
    mysql: {dataType: 'varchar', dataLength: 20, nullable: 'N'},
  })
  title: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {maxLength: 255},
    mysql: {dataType: 'varchar', dataLength: 255, nullable: 'N'},
  })
  icon: string;

  @property({
    type: 'array',
    itemType: 'number',
    required: true,
    minItems: 2,
    jsonSchema: {
      uniqueItems: true,
      minItems: 2,
      minLength: 2,
      minimum: 1,
    },
    mysql: {columnName: 'user_rel_ids', nullable: 'N'},
  })
  userRelIds: number[];

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      source: Users,
      target: () => Groups,
    },
    {
      type: 'number',
      required: true,
      index: {normal: true},
      mysql: {columnName: 'user_id', dataLength: null, nullable: 'N'},
    },
  )
  userId: number;

  @hasMany(() => Dongs, {keyTo: 'groupId'})
  dongs: Dongs[];

  constructor(data?: Partial<Groups>) {
    super(data);
  }
}

export interface GroupsRelations {
  // describe navigational properties here
}

export type GroupsWithRelations = Groups & GroupsRelations;
