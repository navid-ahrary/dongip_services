import {Entity, model, property, hasMany} from '@loopback/repository';

import {VirtualUsers, Dong, Category, CategoryBill, UsersRels} from './';

@model()
export class Users extends Entity {
  @property({
    type: 'string',
    id: true,
    required: false,
    generated: true,
  })
  _key: string;

  @property({
    type: 'string',
    required: false,
    generated: true,
  })
  _id: string;

  @property({
    type: 'string',
    required: false,
    generated: true,
  })
  _rev: string;

  @property({
    type: 'string',
    required: true,
  })
  phone: string;

  @property({
    type: 'string',
  })
  password: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    default: '',
    required: true,
  })
  avatar: string;

  @property({
    type: 'date',
    required: false,
  })
  registeredAt: object;

  @property({
    type: 'string',
    required: false,
  })
  refreshToken: string;

  @property({
    type: 'string',
    required: false,
  })
  accountType = 'bronze';

  @property({
    type: 'string',
    reqiured: true,
  })
  registerationToken: string;

  @property({
    type: 'string',
    reqiured: true,
  })
  userAgent: string;

  @hasMany(() => VirtualUsers, {keyTo: 'belongsToUserId'})
  virtualUsers: VirtualUsers[];

  @hasMany(() => Dong, {keyTo: 'belongsToUserId', name: 'dong'})
  dongs: Dong[];

  @hasMany(() => Category, {keyTo: 'belongsToUserId'})
  categories: Category[];

  @hasMany(() => UsersRels, {keyTo: 'belongsToUserId'})
  usersRels: UsersRels[];

  @hasMany(() => CategoryBill, {keyTo: 'belongsToUserId'})
  categoryBills: CategoryBill[];

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {}

export type UsersWithRelations = Users & UsersRelations;
