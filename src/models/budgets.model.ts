import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Users} from './users.model';
import {Categories} from './categories.model';

@model()
export class Budgets extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  budgetId?: number;

  @property({
    type: 'number',
    required: true,
  })
  budgetAmount: number;

  @property({
    type: 'date',
    required: true,
  })
  date: string;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @belongsTo(() => Users)
  userId: number;

  @belongsTo(() => Categories)
  categoryId: number;

  constructor(data?: Partial<Budgets>) {
    super(data);
  }
}

export interface BudgetsRelations {
  // describe navigational properties here
}

export type BudgetsWithRelations = Budgets & BudgetsRelations;
