import { model, Model, property } from '@loopback/repository';
import { Categories } from './categories.model';
import { Dongs } from './dongs.model';
import { JointAccounts } from './joint-accounts.model';
import { Receipts } from './receipts.model';
import { CurrencyEnum } from './settings.model';
import { UsersRels } from './users-rels.model';
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

  @property({
    type: 'any',
    required: false,
    default: true,
    jsonSchema: {
      oneOf: [{ type: 'null' }, { type: 'boolean', default: true }],
    },
  })
  includeBudget?: boolean | null;

  @property({
    type: 'boolean',
    default: true,
    jsonSchema: { default: true },
  })
  includeBill?: boolean;

  @property({
    type: 'number',
    required: false,
  })
  receiptId?: typeof Receipts.prototype.receiptId;

  @property({
    type: 'any',
    default: false,
    jsonSchema: {
      default: false,
      oneOf: [{ type: 'null' }, { type: 'boolean' }],
    },
  })
  income?: boolean | null;

  @property({
    type: 'number',
    required: false,
  })
  walletId?: number;

  constructor(data?: Partial<PostDong>) {
    super(data);
  }
}

export interface PostDongRelations {}

export type PostDongWithRelations = PostDong & PostDongRelations;
