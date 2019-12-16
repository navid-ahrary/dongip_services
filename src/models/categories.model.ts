import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Users, UsersRelations} from './users.model';

@model({settings: {strict: false}})
export class Categories extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    required: false,
  })
  id: string;

  @property({
    type: 'object',
  })
  charge?: object;

  @property({
    type: 'object',
  })
  taxi?: object;

  @property({
    type: 'object',
  })
  cigar?: object;

  @belongsTo(() => Users)
  usersId: string;
  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Categories>) {
    super(data);
  }
}

export interface CategoriesRelations {
  usersId?: UsersRelations[];
}

export type CategoriesWithRelations = Categories & CategoriesRelations;