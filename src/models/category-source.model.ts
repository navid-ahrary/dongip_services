import {Entity, model, property} from '@loopback/repository';

@model({name: 'categories_source'})
export class CategorySource extends Entity {
  @property({
    type: 'string',
    required: true,
    id: true,
  })
  title: string;

  @property({
    type: 'string',
    required: true,
  })
  icon: string;

  constructor(data?: Partial<CategorySource>) {
    super(data);
  }
}

export interface CategorySourceRelations {
  // describe navigational properties here
}

export type CategorySourceWithRelations = CategorySource &
  CategorySourceRelations;
