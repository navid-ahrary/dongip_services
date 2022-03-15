import { belongsTo, model, property, RelationType } from '@loopback/repository';
import { BaseEntity } from './base-entity.model';
import { Categories } from './categories.model';
import { JointAccounts } from './joint-accounts.model';
import { CurrencyEnum } from './settings.model';
import { UsersRels } from './users-rels.model';
import { Users } from './users.model';

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
      fkBudgetsJointAccountId: {
        name: 'fk_budgets_joint_account_id',
        entity: 'joint_accounts',
        entityKey: 'id',
        foreignKey: 'jointAccountId',
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
export class Budgets extends BaseEntity {
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
  budgetId: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: { minLength: 1, maxLength: 50 },
    mysql: { dataType: 'varchar', dataLength: 50, nullable: 'N' },
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
    mysql: { dataType: 'mediumint', nullable: 'N' },
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
      index: { normal: true },
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
      index: { normal: true },
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
    () => JointAccounts,
    {
      keyFrom: 'jointAccountId',
      keyTo: 'jointAccountId',
      name: 'jointAccount',
      source: JointAccounts,
      target: () => Budgets,
      type: RelationType.belongsTo,
    },
    {
      type: ['null', 'number'],
      index: { normal: true },
      mysql: {
        columnName: 'joint_account_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'Y',
      },
    },
  )
  jointAccountId?: number;

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
      index: { normal: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        nullable: 'N',
      },
    },
  )
  userId: number;

  constructor(data?: Partial<Budgets>) {
    super(data);
  }
}

export interface BudgetsRelations {
  // describe navigational properties here
}

export type BudgetsWithRelations = Budgets & BudgetsRelations;
