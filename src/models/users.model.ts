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
import {Settings, SettingsWithRelations} from './settings.model';
import {Purchases} from './purchases.model';
import {Subscriptions, SubscriptionsWithRelations} from './subscriptions.model';
import {JointAccounts} from './joint-accounts.model';
import {JointAccountSubscribe} from './joint-account-subscribe.model';

@model({name: 'users'})
export class Users extends Entity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
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
    required: false,
    index: {unique: true},
    jsonSchema: {maxLength: 20},
    mysql: {
      columnName: 'phone',
      dataType: 'varchar',
      dataLength: 20,
      nullable: 'Y',
    },
  })
  phone?: string;

  @property({
    type: 'string',
    required: false,
    index: {unique: true},
    jsonSchema: {maxLength: 100},
    mysql: {
      dataType: 'varchar',
      dataLength: 100,
      nullable: 'Y',
    },
  })
  email?: string;

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
    default: null,
    mysql: {
      columnName: 'firebase_token',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'Y',
    },
  })
  firebaseToken?: string;

  @property({
    type: 'string',
    mysql: {
      columnName: 'user_agent',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'Y',
    },
  })
  userAgent?: string;

  @property({
    type: 'string',
    jsonSchema: {minLength: 3, maxLength: 10},
    mysql: {
      dataType: 'varchar',
      dataLength: 10,
      nullable: 'Y',
    },
  })
  platform?: string;

  @property({
    type: 'string',
    mysql: {
      dataType: 'varchar',
      dataLength: 2,
      nullable: 'Y',
    },
  })
  region?: string;

  @property({
    type: 'boolean',
    required: false,
    mysql: {
      columnName: 'phone_locked',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
      default: 1,
    },
  })
  phoneLocked?: boolean;

  @property({
    type: 'boolean',
    required: false,
    mysql: {
      columnName: 'email_locked',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  emailLocked?: boolean;

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
    name: 'setting',
    source: Users,
    target: () => Settings,
    targetsMany: false,
  })
  setting: Settings;

  @hasMany(() => Purchases, {
    keyTo: 'userId',
    type: RelationType.hasMany,
    keyFrom: 'userId',
    name: 'purchases',
    source: Users,
    target: () => Purchases,
    targetsMany: true,
  })
  purchases: Purchases[];

  @hasMany(() => Subscriptions, {
    keyTo: 'userId',
    type: RelationType.hasMany,
    keyFrom: 'userId',
    name: 'subscriptions',
    source: Users,
    target: () => Subscriptions,
    targetsMany: true,
  })
  subscriptions: Subscriptions[];

  @hasMany(() => JointAccounts, {
    name: 'jointAccounts',
    keyFrom: 'userId',
    keyTo: 'jointAccountId',
    type: RelationType.hasMany,
    targetsMany: true,
    source: Users,
    target: () => JointAccounts,
  })
  jointAccounts: JointAccounts[];

  @hasMany(() => JointAccountSubscribe, {
    name: 'jointAccountSubscribes',
    keyFrom: 'userId',
    keyTo: 'jointAccountSubscribeId',
    type: RelationType.hasMany,
    targetsMany: true,
    source: Users,
    target: () => JointAccountSubscribe,
  })
  jointAccountSubscribes: JointAccountSubscribe[];

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {
  setting?: SettingsWithRelations;
  subscriptions?: SubscriptionsWithRelations[];
  JointAccounts?: JointAccounts[];
}

export type UsersWithRelations = Users & UsersRelations;
