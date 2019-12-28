import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Users, UsersRelations} from './users.model';

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

  @property({
    type: 'object',
    requried: false,
    default: {},
  })
  bill?: object;

  @belongsTo(() => Users)
  usersId: string;

  constructor(data?: Partial<Category>) {
    super(data);
  }
}

export interface CategoryRelations {
  users?: UsersRelations[];
}

export type CategoryWithRelations = Category & CategoryRelations;
