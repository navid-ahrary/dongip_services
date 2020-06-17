import {Entity, model, property} from '@loopback/repository';

@model({name: 'categories_source'})
export class CategoriesSource extends Entity {
  @property({type: 'string', required: true, id: true}) title: string;
  @property({
    type: 'string',
    required: true,
    jsonSchema: {minLength: 3, maxLength: 512},
    mysql: {dataType: 'varchar', dataLength: 512, nullable: 'N'},
  })
  icon: string;

  constructor(data?: Partial<CategoriesSource>) {
    super(data);
  }
}

export interface CategoriesSourceRelations {
  // describe navigational properties here
}

export type CategoriesSourceWithRelations = CategoriesSource &
  CategoriesSourceRelations;
