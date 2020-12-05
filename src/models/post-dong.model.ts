import { property, model, Model } from '@loopback/repository';

import { UsersRels } from './users-rels.model';
import { Categories } from './categories.model';
import { CurrencyEnum } from './settings.model';
import { JointAccounts } from './joint-accounts.model';
import { Dongs } from './dongs.model';
import { Users } from './users.model';

@model()
export class PostDong extends Model {
  @property({
    type: 'number',
  })
  dongId?: typeof Dongs.prototype.dongId;

  @property({
    type: 'string',
    requird: true,
  })
  title: string;

  @property({
    type: 'string',
  })
  desc: string;

  @property({
    type: 'number',
  })
  userId?: typeof Users.prototype.userId;

  @property({
    type: 'date',
    required: true,
  })
  createdAt: string;

  @property({
    type: 'number',
    required: true,
  })
  pong: number;

  @property({
    type: 'boolean',
  })
  sendNotify?: boolean;

  @property({
    type: 'number',
    required: true,
  })
  categoryId: typeof Categories.prototype.categoryId;

  @property({
    type: 'number',
  })
  jointAccountId?: typeof JointAccounts.prototype.jointAccountId;

  @property({
    type: 'string',
    default: 'IRT',
    jsonSchema: {
      description: 'ISO 4217',
      minLength: 3,
      maxLength: 3,
      enum: Object.values(CurrencyEnum),
    },
  })
  currency?: string;

  @property({
    type: 'array',
    itemType: 'object',
  })
  payerList: {
    userRelId: typeof UsersRels.prototype.userRelId;
    dongAmount: number;
  }[];

  @property({
    type: 'array',
    itemType: 'object',
  })
  billList: {
    userRelId: typeof UsersRels.prototype.userRelId;
    dongAmount: number;
  }[];

  @property({
    type: 'any',
    jsonSchema: {
      oneOf: [
        { type: 'null', default: true },
        { type: 'boolean', default: true },
      ],
    },
    required: false,
    default: true,
  })
  includeBudget?: boolean | null;

  @property({
    type: 'boolean',
    default: true,
    jsonSchema: { default: true },
  })
  includeBill?: boolean;

  constructor(data?: Partial<PostDong>) {
    super(data);
  }
}

export interface PostDongRelations {}

export type PostDongWithRelations = PostDong & PostDongRelations;
