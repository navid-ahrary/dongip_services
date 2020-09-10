import {model, property, Model} from '@loopback/repository';

import {Categories} from './categories.model';
import {UsersRels} from './users-rels.model';

@model()
export class PostNewDong extends Model {
  @property({type: 'number'}) dongId?: number;

  @property({type: 'string', requird: true}) title: string;

  @property({type: 'string', required: true}) desc: string;

  @property({type: 'number'}) userId?: number;

  @property({type: 'date', required: true}) createdAt: string;

  @property({type: 'number', required: true}) pong: number;

  @property({type: 'boolean'}) sendNotify?: boolean;

  @property({type: 'number'})
  categoryId: typeof Categories.prototype.categoryId;

  @property({type: 'number'}) groupId: number;

  @property({
    type: 'string',
    default: 'IRR',
    jsonSchema: {
      minLength: 3,
      maxLength: 3,
      description: 'ISO 4217',
    },
  })
  currency?: string;

  @property({type: 'array', itemType: 'object'})
  payerList: {
    userRelId: typeof UsersRels.prototype.userRelId;
    paidAmount: number;
  }[];

  @property({type: 'array', itemType: 'object'})
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
