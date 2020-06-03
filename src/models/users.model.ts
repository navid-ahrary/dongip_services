import {
  Entity,
  model,
  property,
  hasMany,
  RelationType,
} from '@loopback/repository';

import {BillList} from './bill-list.model';
import {PayerList} from './payer-list.model';
import {VirtualUsers} from './virtual-users.model';
import {Dong} from './dong.model';
import {Category} from './category.model';
import {UsersRels} from './users-rels.model';

@model()
export class Users extends Entity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
  })
  userId: number;

  @property({
    type: 'string',
    required: true,
    length: 13,
  })
  phone: string;

  @property({
    type: 'string',
    required: true,
    length: 30,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
    length: 180,
  })
  avatar: string;

  @property({
    type: 'date',
    required: true,
  })
  registeredAt: string;

  @property({
    type: 'string',
  })
  refreshToken: string;

  @property({
    type: 'string',
    required: true,
    length: 20,
    default: 'bronze',
  })
  accountType: string;

  @property({
    type: 'string',
    required: true,
  })
  firebaseToken: string;

  @property({
    type: 'string',
    required: true,
  })
  userAgent: string;

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

  @hasMany(() => Dong, {
    name: 'dongs',
    keyTo: 'userId',
    keyFrom: 'userId',
    type: RelationType.hasMany,
    source: Users,
    target: () => Dong,
    targetsMany: true,
  })
  dongs: Dong[];

  @hasMany(() => Category, {
    name: 'categories',
    keyTo: 'userId',
    keyFrom: 'userId',
    type: RelationType.hasMany,
    source: Users,
    target: () => Category,
    targetsMany: true,
  })
  categories: Category[];

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

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {}

export type UsersWithRelations = Users & UsersRelations;
