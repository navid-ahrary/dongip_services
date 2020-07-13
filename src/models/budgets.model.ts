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
      dataType: 'int',
      nullable: 'N',
    },
  })
  budgetId?: number;

  @property({
    type: 'number',
    required: true,
    mysql: {
      columnName: 'budget_amount',
      dataType: 'bigint',
      nullable: 'N',
    },
  })
  budgetAmount: number;

  @property({
    type: 'number',
    required: true,
    mysql: {dataType: 'int', nullable: 'N'},
  })
  date: number;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @belongsTo(
    () => Users,
    {},
    {
      type: 'Number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'int',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  userId: number;

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
      type: 'number',
      index: {normal: true},
      mysql: {
        columnName: 'category_id',
        dataType: 'int',
        dataLength: null,
        nullable: 'Y',
      },
    },
  )
  categoryId: number;

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
      type: 'number',
      index: {normal: true},
      mysql: {
        columnName: 'user_rel_id',
        dataType: 'int',
        dataLength: null,
        nullable: 'Y',
      },
    },
  )
  userRelId: number;

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
  groupId: number;

  @property({
    type: 'date',
    required: true,
    defaultFn: 'now',
    mysql: {columnName: 'created_at', dataType: 'datetime', nullable: 'N'},
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
