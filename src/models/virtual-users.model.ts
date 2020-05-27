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
    type: 'number',
    id: true,
    generated: true,
    required: false,
  })
  id: number;

  @property({
    type: 'string',
    required: true,
  })
  phone: string;

  @belongsTo(() => Users, {name: 'belongsToUser'})
  belongsToUserId: typeof Users.prototype.id;

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
