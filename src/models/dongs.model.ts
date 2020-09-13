/* eslint-disable @typescript-eslint/naming-convention */
import {
  Entity,
  model,
  property,
  belongsTo,
  hasMany,
  RelationType,
  Model,
} from '@loopback/repository';

import {Users} from './users.model';
import {Categories} from './categories.model';
import {PayerList} from './payer-list.model';
import {BillList} from './bill-list.model';
import {Groups} from './groups.model';
import {Scores} from './scores.model';
import {UsersRels} from './users-rels.model';

enum CurrencyEnum {
  IRAN_RIAL = 'IRR',
  IRAN_TOMAN = 'IRT',
  DUBAI_DIRHAM = 'AED',
  US_DOLLAR = 'USD',
  EUROPE_EURO = 'EUR',
}

@model({
  name: 'dongs',
  settings: {
    foreignKeys: {
      fkDongsUserId: {
        name: 'fk_dongs_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'no action',
        onDelete: 'cascade',
      },
      fkDongsCategoryId: {
        name: 'fk_dongs_category_id',
        entity: 'categories',
        entityKey: 'id',
        foreignKey: 'categoryId',
        onUpdate: 'no action',
        onDelete: 'cascade',
      },
      // fkDongsGroupId: {
      //   name: 'fk_dongs_group_id',
      //   entity: 'groups',
      //   entityKey: 'id',
      //   foreignKey: 'groupId',
      //   onUpdate: 'no action',
      //   onDelete: 'no action',
      // },
    },
  },
})
export class Dongs extends Entity {
  @property({
    type: 'Number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'int',
      dataLength: null,
      nullable: 'N',
    },
  })
  dongId: number;

  @property({
    type: 'string',
    jsonSchema: {maxLength: 255},
    mysql: {
      columnName: 'title',
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'Y',
    },
  })
  title?: string;

  @property({
    type: 'string',
    jsonSchema: {maxLength: 255},
    mysql: {
      columnName: 'desc',
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'Y',
    },
  })
  desc?: string;

  @property({
    type: 'date',
    required: true,
    mysql: {
      columnName: 'created_at',
      dataType: 'datetime',
      dataLength: null,
      nullable: 'N',
    },
  })
  createdAt: string;

  @property({
    type: 'Number',
    required: true,
    mysql: {
      columnName: 'pong',
      dataLength: null,
      dataType: 'bigint',
      nullable: 'N',
    },
  })
  pong: number;

  @property({
    type: 'string',
    default: 'IRT',
    jsonSchema: {
      description: 'ISO 4217',
      minLength: 3,
      maxLength: 3,
      enum: Object.values(CurrencyEnum),
    },
    mysql: {
      dataType: 'varchar',
      dataLength: 3,
      nullable: 'N',
    },
  })
  currency: CurrencyEnum;

  @belongsTo(
    () => Users,
    {
      name: 'users',
      keyFrom: 'userId',
      keyTo: 'userId',
      source: Users,
      target: () => Dongs,
      type: RelationType.belongsTo,
    },
    {
      type: 'Number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  userId: number;

  @belongsTo(
    () => Categories,
    {
      name: 'categories',
      keyFrom: 'categoryId',
      keyTo: 'categoryId',
      source: Categories,
      target: () => Dongs,
      type: RelationType.belongsTo,
    },
    {
      type: 'Number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'category_id',
        dataType: 'int',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  categoryId: number;

  @belongsTo(
    () => Groups,
    {
      name: 'group',
      keyFrom: 'groupId',
      keyTo: 'groupId',
      source: Groups,
      target: () => Dongs,
      type: RelationType.belongsTo,
    },
    {
      type: 'number',
      index: {normal: true},
      mysql: {
        columnName: 'group_id',
        dataType: 'int',
        dataLength: null,
        nullable: 'Y',
      },
    },
  )
  groupId?: number;

  @hasMany(() => BillList, {
    name: 'billList',
    keyFrom: 'dongId',
    keyTo: 'dongId',
    source: Dongs,
    target: () => BillList,
    type: RelationType.hasMany,
    targetsMany: true,
  })
  billList: BillList[];

  @hasMany(() => PayerList, {
    name: 'payerList',
    keyFrom: 'dongId',
    keyTo: 'dongId',
    source: Dongs,
    target: () => PayerList,
    type: RelationType.hasMany,
    targetsMany: true,
  })
  payerList: PayerList[];

  @hasMany(() => Scores, {
    name: 'scores',
    keyTo: 'dongId',
    keyFrom: 'dongId',
    source: Dongs,
    target: () => Scores,
    type: RelationType.hasMany,
    targetsMany: true,
  })
  scores: Scores[];

  constructor(data?: Partial<Dongs>) {
    super(data);
  }
}

export interface DongsRelations {}

export type DongsWithRelations = Dongs & DongsRelations;

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
