import {property, model, Model} from '@loopback/repository';

import {UsersRels} from './users-rels.model';
import {Categories} from './categories.model';
import {CurrencyEnum} from './settings.model';

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
    default: 'IRT',
    jsonSchema: {
      description: 'ISO 4217',
      minLength: 3,
      maxLength: 3,
      default: 'IRT',
      enum: Object.values(CurrencyEnum),
    },
  })
  currency?: CurrencyEnum;

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

export interface PostNewDongRelations {}

export type PostNewDongWithRelations = PostNewDong & PostNewDongRelations;