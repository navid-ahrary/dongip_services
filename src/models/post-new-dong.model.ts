import {model, property, Model} from '@loopback/repository';
import {Category} from './category.model';
import {UsersRels} from './users-rels.model';

@model()
export class PostNewDong extends Model {
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
    type: 'number',
  })
  userId?: number;

  @property({
    type: 'date',
    required: true,
  })
  createdAt: Date;

  @property({
    type: 'number',
    required: true,
  })
  pong: number;

  @property({
    type: 'number',
  })
  categoryId: typeof Category.prototype.categoryId;

  @property({
    type: 'array',
    itemType: 'object',
  })
  payerList: {
    userRelId: typeof UsersRels.prototype.userRelId;
    paidAmount: number;
  }[];

  @property({
    type: 'array',
    itemType: 'object',
  })
  billList: {
    userRelId: typeof UsersRels.prototype.userRelId;
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
