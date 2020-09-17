import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
} from '@loopback/repository';

import {Users} from './users.model';
import {Categories} from './categories.model';
import {UsersRels} from './users-rels.model';
import {Groups} from './groups.model';
import {CurrencyEnum} from './settings.model';

@model({
  name: 'budgets',
  settings: {
    foreignKeys: {
      fkBudgetsCategoryId: {
        name: 'fk_budgets_category_id',
        entity: 'categories',
        entityKey: 'id',
        foreignKey: 'categoryId',
        onUpdate: 'no action',
        onDelete: 'cascade',
      },
      fkBudgetsUserRelId: {
        name: 'fk_budgets_user_rel_id',
        entity: 'users_rels',
        entityKey: 'id',
        foreignKey: 'userRelId',
        onUpdate: 'no action',
        onDelete: 'cascade',
      },
      fkBudgetsGroupId: {
        name: 'fk_budgets_group_id',
        entity: 'groups',
        entityKey: 'id',
        foreignKey: 'groupId',
        onUpdate: 'no action',
        onDelete: 'cascade',
      },
      fkBudgetsUserId: {
        name: 'fk_budgets_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class Budgets extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
      nullable: 'N',
    },
  })
  budgetId?: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {minLength: 1, maxLength: 20},
    mysql: {dataType: 'varchar', dataLength: 20, nullable: 'N'},
  })
  title: string;

  @property({
    type: 'number',
    required: true,
    mysql: {
      columnName: 'budget_amount',
      dataType: 'bigint unsigned',
      nullable: 'N',
    },
  })
  budgetAmount: number;

  @property({
    type: 'string',
    required: false,
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

  @property({
    type: 'number',
    required: false,
    mysql: {dataType: 'mediumint', nullable: 'N'},
  })
  date: number;

  @property({
    type: 'date',
    mysql: {
      columnName: 'start_date',
      dataType: 'datetime',
      nullable: 'Y',
    },
  })
  startDate?: string;

  @property({
    type: 'date',
    mysql: {
      columnName: 'end_date',
      dataType: 'datetime',
      nullable: 'Y',
    },
  })
  endDate?: string;

  @belongsTo(
    () => Categories,
    {
      keyFrom: 'categoryId',
      keyTo: 'categoryId',
      name: 'category',
      source: Categories,
      target: () => Budgets,
      type: RelationType.belongsTo,
    },
    {
      type: ['null', 'number'],
      index: {normal: true},
      mysql: {
        columnName: 'category_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'Y',
      },
    },
  )
  categoryId?: number;

  @belongsTo(
    () => UsersRels,
    {
      keyFrom: 'userRelId',
      keyTo: 'userRelId',
      name: 'userRel',
      source: UsersRels,
      target: () => Budgets,
      type: RelationType.belongsTo,
    },
    {
      type: ['null', 'number'],
      index: {normal: true},
      mysql: {
        columnName: 'user_rel_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'Y',
      },
    },
  )
  userRelId?: number;

  @belongsTo(
    () => Groups,
    {
      keyFrom: 'groupId',
      keyTo: 'groupId',
      name: 'group',
      source: Groups,
      target: () => Budgets,
      type: RelationType.belongsTo,
    },
    {
      type: ['null', 'number'],
      index: {normal: true},
      mysql: {
        columnName: 'group_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'Y',
      },
    },
  )
  groupId?: number;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      source: Users,
      target: () => Budgets,
    },
    {
      type: 'number',
      required: true,
      index: {normal: true},
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
    required: true,
    defaultFn: 'now',
    mysql: {
      columnName: 'created_at',
      dataType: 'timestamp',
      nullable: 'N',
      default: 'now',
    },
  })
  createdAt: string;

  constructor(data?: Partial<Budgets>) {
    super(data);
  }
}

export interface BudgetsRelations {
  // describe navigational properties here
}

export type BudgetsWithRelations = Budgets & BudgetsRelations;
