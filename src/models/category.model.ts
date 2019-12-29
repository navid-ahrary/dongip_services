import {Entity, model, property, belongsTo, hasMany} from '@loopback/repository';
import {Users, UsersRelations} from './users.model';
import {CategoryBill} from './category-bill.model';

@model()
export class Category extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    required: false,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @belongsTo(() => Users)
  usersId: string;

  @hasMany(() => CategoryBill)
  categoryBills: CategoryBill[];

  constructor(data?: Partial<Category>) {
    super(data);
  }
}

export interface CategoryRelations {
  users?: UsersRelations[];
}

export type CategoryWithRelations = Category & CategoryRelations;
