import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
} from '@loopback/repository';
import {Users, UsersRels, Category, CategoryBill, Dong} from './';

@model()
export class VirtualUsers extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    required: false,
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

  @belongsTo(() => Users, {name: 'belongsToUser'})
  belongsToUserId: string;

  @hasMany(() => Dong, {keyTo: 'xManKey'})
  dongs: Dong[];

  @hasMany(() => Category, {keyTo: 'belongsToUserId'})
  categories: Category[];

  @hasMany(() => UsersRels, {keyTo: 'belongsToUserId'})
  usersRels: UsersRels[];

  @hasMany(() => CategoryBill, {keyTo: 'targetUserId'})
  categoryBills: CategoryBill[];

  constructor(data?: Partial<VirtualUsers>) {
    super(data);
  }
}

export interface VirtualUsersRelations {}

export type VirtualUsersWithRelations = VirtualUsers & VirtualUsersRelations;
