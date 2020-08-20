import {
  Entity,
  model,
  property,
  hasMany,
  RelationType,
  hasOne,
} from '@loopback/repository';

import {BillList} from './bill-list.model';
import {PayerList} from './payer-list.model';
import {VirtualUsers} from './virtual-users.model';
import {Dongs} from './dongs.model';
import {Categories} from './categories.model';
import {UsersRels} from './users-rels.model';
import {Scores} from './scores.model';
import {Groups} from './groups.model';
import {Messages} from './messages.model';
import {Notifications} from './notifications.model';
import {Budgets} from './budgets.model';
import {Settings} from './settings.model';
import {Checkouts} from './checkouts.model';

@model({name: 'users'})
export class Users extends Entity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint',
      dataLength: null,
      nullable: 'N',
    },
  })
  userId: number;

  @property({
    type: 'string',
    jsonSchema: {maxLength: 50},
    index: {unique: true},
    mysql: {dataType: 'varchar', dataLength: 50, nullable: 'Y'},
  })
  username?: string;

  @property({
    type: 'string',
    required: true,
    index: {unique: true},
    jsonSchema: {maxLength: 20},
    mysql: {
      columnName: 'phone',
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'N',
    },
  })
  phone: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {minLength: 3, maxLength: 30},
    mysql: {
      columnName: 'name',
      dataType: 'varchar',
      dataLength: 30,
      nullable: 'N',
    },
  })
  name: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {minLength: 3, maxLength: 512},
    mysql: {dataType: 'varchar', dataLength: 512, nullable: 'N'},
  })
  avatar: string;

  @property({
    type: 'date',
    required: true,
    defaultFn: 'now',
    mysql: {
      columnName: 'registered_at',
      dataType: 'datetime',
      dataLength: null,
      nullable: 'N',
    },
  })
  registeredAt: string;

  @property({
    type: 'string',
    mysql: {
      columnName: 'refresh_token',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'Y',
    },
  })
  refreshToken: string;

  @property({
    type: 'array',
    itemType: 'string',
    required: true,
    default: ['BRONZE'],
    mysql: {
      dataType: 'text',
      dataLength: 100,
      nullable: 'N',
    },
  })
  roles: string[];

  @property({
    type: 'string',
    default: 'null',
    mysql: {
      columnName: 'firebase_token',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'N',
    },
  })
  firebaseToken: string;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'user_agent',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'N',
    },
  })
  userAgent: string;

  @property({
    type: 'string',
    required: true,
    default: 'and',
    jsonSchema: {minLength: 3, maxLength: 3},
    mysql: {
      dataType: 'varchar',
      dataLength: 3,
      nullable: 'N',
    },
  })
  platform: string;

  @property({
    type: 'string',
    required: true,
    mysql: {
      dataType: 'varchar',
      dataLength: 2,
      nullable: 'N',
    },
  })
  region: string;

  @property({
    type: 'string',
    mysql: {
      columnName: 'cafebazaar_purchase_token',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'Y',
    },
  })
  cafebazaarPurchaseToken?: string;

  @hasMany(() => VirtualUsers, {
    name: 'virtualUsers',
    keyTo: 'userId',
    keyFrom: 'userId',
    type: RelationType.hasMany,
    source: Users,
    target: () => VirtualUsers,
    targetsMany: true,
  })
  virtualUsers: VirtualUsers[];

  @hasMany(() => Dongs, {
    name: 'dongs',
    keyTo: 'userId',
    keyFrom: 'userId',
    type: RelationType.hasMany,
    source: Users,
    target: () => Dongs,
    targetsMany: true,
  })
  dongs: Dongs[];

  @hasMany(() => Categories, {
    name: 'categories',
    keyTo: 'userId',
    keyFrom: 'userId',
    type: RelationType.hasMany,
    source: Users,
    target: () => Categories,
    targetsMany: true,
  })
  categories: Categories[];

  @hasMany(() => UsersRels, {
    name: 'usersRels',
    keyTo: 'userId',
    keyFrom: 'userId',
    type: RelationType.hasMany,
    source: Users,
    target: () => UsersRels,
    targetsMany: true,
  })
  usersRels: UsersRels[];

  @hasMany(() => BillList, {
    keyTo: 'userId',
    keyFrom: 'userId',
    name: 'billList',
    type: RelationType.hasMany,
    source: Users,
    target: () => BillList,
    targetsMany: true,
  })
  billList: BillList[];

  @hasMany(() => PayerList, {
    keyTo: 'userId',
    keyFrom: 'userId',
    name: 'payerList',
    type: RelationType.hasMany,
    source: Users,
    target: () => PayerList,
    targetsMany: true,
  })
  payerList: PayerList[];

  @hasMany(() => Scores, {
    type: RelationType.hasMany,
    keyTo: 'userId',
    keyFrom: 'userId',
    name: 'scores',
    source: Users,
    target: () => Scores,
    targetsMany: true,
  })
  scores: Scores[];

  @hasMany(() => Groups, {
    type: RelationType.hasMany,
    keyTo: 'userId',
    keyFrom: 'userId',
    name: 'groups',
    source: Users,
    target: () => Groups,
    targetsMany: true,
  })
  groups: Groups[];

  @hasMany(() => Messages, {
    type: RelationType.hasMany,
    keyTo: 'userId',
    keyFrom: 'userId',
    name: 'messages',
    source: Users,
    target: () => Messages,
    targetsMany: true,
  })
  messages: Messages[];

  @hasMany(() => Notifications, {
    keyTo: 'userId',
    type: RelationType.hasMany,
    keyFrom: 'userId',
    name: 'notifications',
    source: Users,
    target: () => Notifications,
    targetsMany: true,
  })
  notifications: Notifications[];

  @hasMany(() => Budgets, {
    keyTo: 'userId',
    type: RelationType.hasMany,
    keyFrom: 'userId',
    name: 'budgets',
    source: Users,
    target: () => Budgets,
    targetsMany: true,
  })
  budgets: Budgets[];

  @hasOne(() => Settings, {
    keyTo: 'userId',
    type: RelationType.hasOne,
    keyFrom: 'userId',
    name: 'messages',
    source: Users,
    target: () => Settings,
    targetsMany: false,
  })
  settings: Settings;

  @hasMany(() => Checkouts, {keyTo: 'userId'})
  checkouts: Checkouts[];

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {}

export type UsersWithRelations = Users & UsersRelations;
