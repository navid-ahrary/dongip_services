/* eslint-disable @typescript-eslint/naming-convention */
import { Entity, model, property, belongsTo, hasMany, RelationType } from '@loopback/repository';
import { Users, BillList, PayerList, Dongs, Budgets } from './';

@model({
  name: 'categories',
  settings: {
    scope: {
      where: { deleted: false },
    },
    indexes: {
      'user_id&title': {
        name: 'user_id&title',
        columns: 'user_id, title',
        options: { unique: true },
      },
    },
    foreignKeys: {
      fkCategoriesUserId: {
        name: 'fk_categories_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkCategoriesParentCategorId: {
        name: 'fk_categories_parent_category_id',
        entity: 'categories',
        entityKey: 'id',
        foreignKey: 'parentCategoryId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
  jsonSchema: { description: 'Categories model' },
})
export class Categories extends Entity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
      nullable: 'N',
    },
  })
  categoryId: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: { maxLength: 255 },
    mysql: {
      columnName: 'title',
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'N',
    },
  })
  title: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: { minLength: 3, maxLength: 512 },
    mysql: { dataType: 'varchar', dataLength: 512, nullable: 'N' },
  })
  icon: string;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      source: Users,
      target: () => Categories,
    },
    {
      type: 'number',
      required: true,
      index: { normal: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        nullable: 'N',
      },
    },
  )
  userId: number;

  @property({
    type: 'date',
    required: false,
    mysql: {
      columnName: 'created_at',
      dataType: 'datetime',
      default: 'now',
      nullable: 'N',
    },
  })
  createdAt: string;

  @hasMany(() => BillList, {
    name: 'billLists',
    keyFrom: 'categoryId',
    keyTo: 'categoryId',
    type: RelationType.hasMany,
    source: Categories,
    target: () => BillList,
    targetsMany: true,
  })
  billList: BillList[];

  @hasMany(() => PayerList, {
    name: 'payerLists',
    keyFrom: 'categoryId',
    keyTo: 'categoryId',
    type: RelationType.hasMany,
    source: Categories,
    target: () => PayerList,
    targetsMany: true,
  })
  payerList: PayerList[];

  @hasMany(() => Dongs, {
    keyTo: 'categoryId',
    keyFrom: 'categoryId',
    type: RelationType.hasMany,
    source: Categories,
    target: () => Dongs,
    targetsMany: true,
  })
  dongs: Dongs[];

  @hasMany(() => Budgets, {
    keyTo: 'categoryId',
    keyFrom: 'categoryId',
    type: RelationType.hasMany,
    source: Categories,
    target: () => Budgets,
    targetsMany: true,
  })
  budgets: Budgets[];

  @belongsTo(
    () => Categories,
    {
      name: 'parentCategroy',
      keyTo: 'categroyId',
      source: Categories,
    },
    {
      type: 'number',
      jsonSchema: { minimum: 1 },
      mysql: {
        columnName: 'parent_category_id',
        dataType: 'mediumint unsigned',
        nullable: 'Y',
      },
    },
  )
  parentCategoryId?: number;

  @hasMany(() => Categories, { keyTo: 'parentCategoryId' })
  categories: Categories[];

  constructor(data?: Partial<Categories>) {
    super(data);
  }
}

export interface CategoriesRelations {}

export type CategoriesWithRelations = Categories & CategoriesRelations;
