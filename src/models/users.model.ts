import { hasMany, hasOne, model, property, RelationType } from '@loopback/repository';
import { Accounts, AccountsWithRelations } from './accounts.model';
import { BaseEntity } from './base-entity.model';
import { BillList } from './bill-list.model';
import { Budgets } from './budgets.model';
import { Categories } from './categories.model';
import { Dongs } from './dongs.model';
import {
  JointAccountSubscribes,
  JointAccountSubscribesWithRelations,
} from './joint-account-subscribes.model';
import { JointAccounts, JointAccountsWithRelations } from './joint-accounts.model';
import { Messages } from './messages.model';
import { Notifications } from './notifications.model';
import { PayerList } from './payer-list.model';
import { Purchases } from './purchases.model';
import { Receipts } from './receipts.model';
import { RefreshTokens } from './refresh-tokens.model';
import { Reminders, RemindersWithRelations } from './reminders.model';
import { Scores } from './scores.model';
import { Settings, SettingsWithRelations } from './settings.model';
import { Subscriptions, SubscriptionsWithRelations } from './subscriptions.model';
import { UsersRels, UsersRelsWithRelations } from './users-rels.model';
import { Wallets, WalletsWithRelations } from './wallets.model';

@model({ name: 'users' })
export class Users extends BaseEntity {
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
    jsonSchema: { maxLength: 50 },
    index: { unique: true },
    mysql: {
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'Y',
    },
  })
  username?: string;

  @property({
    type: 'string',
    required: false,
    index: { unique: true },
    jsonSchema: { maxLength: 20 },
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
    index: { unique: true },
    jsonSchema: { maxLength: 100 },
    mysql: {
      dataType: 'varchar',
      dataLength: 100,
      nullable: 'Y',
    },
  })
  email?: string;

  @property({
    type: 'string',
    required: false,
    jsonSchema: {
      minLength: 1,
      maxLength: 50,
    },
    mysql: {
      columnName: 'name',
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'Y',
    },
  })
  name?: string;

  @property({
    type: 'string',
    required: false,
    jsonSchema: {
      minLength: 3,
      maxLength: 512,
    },
    mysql: {
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'Y',
    },
  })
  avatar?: string;

  @property({
    type: 'date',
    required: false,
    mysql: {
      columnName: 'registered_at',
      dataType: 'datetime',
      default: 'now',
      nullable: 'N',
    },
  })
  registeredAt: string;

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
    jsonSchema: {
      minLength: 3,
      maxLength: 100,
    },
    mysql: {
      dataType: 'varchar',
      dataLength: 100,
      nullable: 'Y',
    },
  })
  platform?: string;

  @property({
    type: 'string',
    default: 'IR',
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
    default: false,
    mysql: {
      columnName: 'phone_locked',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  phoneLocked?: boolean;

  @property({
    type: 'boolean',
    required: false,
    default: false,
    mysql: {
      columnName: 'email_locked',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'N',
    },
  })
  emailLocked?: boolean;

  @property({
    type: 'string',
    required: false,
    mysql: {
      columnName: 'referral_code',
      dataType: 'varchar',
      dataLength: 10,
      nullable: 'Y',
    },
  })
  referralCode?: string;

  @property({
    type: 'string',
    required: false,
    mysql: {
      columnName: 'app_version',
      dataType: 'varchar',
      dataLength: 10,
      nullable: 'Y',
    },
  })
  appVersion?: string;

  @property({
    type: 'boolean',
    default: true,
    mysql: {
      columnName: 'enabled',
      dataType: 'tinyint',
      dataLength: 1,
      nullable: 'Y',
      dafault: 1,
    },
  })
  enabled: boolean;

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
    keyTo: 'userId',
    type: RelationType.hasMany,
    targetsMany: true,
    source: Users,
    target: () => JointAccounts,
  })
  jointAccounts?: JointAccounts[];

  @hasMany(() => JointAccountSubscribes, {
    keyTo: 'userId',
    keyFrom: 'userId',
    targetsMany: true,
    type: RelationType.hasMany,
    source: Users,
    target: () => JointAccountSubscribes,
  })
  jointAccountSubscribes: JointAccountSubscribes[];

  @hasOne(() => RefreshTokens, { keyTo: 'userId' })
  refreshToken: RefreshTokens;

  @hasMany(() => Reminders, { keyTo: 'userId' })
  reminders: Reminders[];

  @hasMany(() => Receipts, { keyTo: 'userId' })
  receipts: Receipts[];

  @hasMany(() => Wallets, { keyTo: 'userId' })
  wallets: Wallets[];

  @hasMany(() => Accounts, { keyTo: 'userId' })
  accounts: Accounts[];

  @property({
    type: 'string',
    mysql: {
      dataType: 'varchar',
      dataLength: 30,
    },
  })
  marketplace?: string;

  @property({
    type: 'boolean',
    required: true,
    default: false,
    mysql: {
      columnName: 'is_completed',
      dataType: 'tinyint',
      dataLength: 1,
      default: 1,
      nullable: 'N',
    },
  })
  isCompleted: boolean;

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {
  setting: SettingsWithRelations;
  usersRels: UsersRelsWithRelations[];
  subscriptions?: SubscriptionsWithRelations[];
  jointAccounts?: JointAccountsWithRelations[];
  jointAccountSubscribes?: JointAccountSubscribesWithRelations[];
  reminders?: RemindersWithRelations[];
  wallets?: WalletsWithRelations[];
  accounts?: AccountsWithRelations[];
}

export type UsersWithRelations = Users & UsersRelations;
