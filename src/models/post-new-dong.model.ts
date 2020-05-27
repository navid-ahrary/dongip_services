import {Entity, model, property} from '@loopback/repository';
import {Category} from './category.model';
import {UsersRels} from './users-rels.model';

@model()
export class PostNewDong extends Entity {
  @property({
    type: 'string',
    requird: true,
  })
  title: string;
  @property({
    type: 'string',
    required: true,
  })
  desc: string;
  @property({
    type: 'string',
    required: true,
  })
  createdAt: string;
  @property({
    type: 'number',
    required: true,
  })
  pong: number;
  @property({
    type: 'number',
  })
  categoryId: typeof Category.prototype.id;

  @property({
    type: 'array',
    itemType: 'object',
  })
  payerList: {
    usersRelsId: typeof UsersRels.prototype.id;
    paidAmount: number;
  }[];

  @property({
    type: 'array',
    itemType: 'object',
  })
  billList: {
    usersRelsId: typeof UsersRels.prototype.id;
    dongAmount: number;
  }[];
  constructor(data?: Partial<PostNewDong>) {
    super(data);
  }
}

export interface PostNewDongRelations {
  // describe navigational properties here
}

export type PostNewDongWithRelations = PostNewDong & PostNewDongRelations;
