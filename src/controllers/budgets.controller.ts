import { repository, Count, CountSchema } from '@loopback/repository';
import { param, get, getModelSchemaRef, patch, del, requestBody, post } from '@loopback/rest';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { inject, intercept } from '@loopback/core';
import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import moment from 'moment';
import { Budgets, Users } from '../models';
import { BudgetsRepository } from '../repositories';
import { FirebaseTokenInterceptor, ValidateBudgetIdInterceptor } from '../interceptors';

@authenticate('jwt.access')
@intercept(ValidateBudgetIdInterceptor.BINDING_KEY, FirebaseTokenInterceptor.BINDING_KEY)
export class BudgetsController {
  private readonly userId: typeof Users.prototype.userId;

  constructor(
    @repository(BudgetsRepository) public budgetsRepository: BudgetsRepository,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ) {
    this.userId = +currentUserProfile[securityId];
  }

  @get('/budgets/', {
    summary: 'GET all Budgets',
    description: 'Budgets belongs to [Group, Category, UserRel] are included too',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Budgets model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Budgets, { includeRelations: false }),
            },
          },
        },
      },
    },
  })
  async findBudgets(): Promise<Budgets[]> {
    return this.budgetsRepository.find({ where: { userId: this.userId } });
  }

  @post('/budgets/', {
    summary: 'POST a Budget for all expenses',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Budgets model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Budgets, { includeRelations: false }),
          },
        },
      },
    },
  })
  async createBudgets(
    @requestBody({
      description: 'Create a budget at specified period',
      content: {
        'application/json': {
          schema: getModelSchemaRef(Budgets, {
            title: 'NewBudgets',
            exclude: ['budgetId', 'createdAt'],
            optional: ['userId'],
          }),

          examples: {
            CategoryBudget: {
              value: {
                title: 'My Category Budget',
                budgetAmount: 700000,
                currency: 'IRT',
                userRelId: 0,
                categoryId: 1,
                groupId: 0,
                startDate: moment(),
                endDate: moment().add(1, 'm'),
              },
            },
            UserRelBudget: {
              value: {
                title: 'My UserRel Budget',
                budgetAmount: 700000,
                currency: 'AED',
                userRelId: 1,
                categoryId: 0,
                groupId: 0,
                startDate: moment(),
                endDate: moment().add(3, 'm'),
              },
            },
            JointAccountBudget: {
              value: {
                title: 'My Joint Budget',
                budgetAmount: 700000,
                currency: 'USD',
                userRelId: 0,
                categoryId: 0,
                groupId: 1,
                startDate: moment(),
                endDate: moment().add(1, 'y'),
              },
            },
          },
        },
      },
    })
    newBudget: Omit<Budgets, 'budgetId'>,
  ): Promise<Budgets> {
    return this.budgetsRepository.create({ ...newBudget, userId: this.userId });
  }

  @patch('/budgets/{budgetId}', {
    summary: 'PATCH a Budget by budgetId',
    description: 'Budgets belongs to [Group, Category, UserRel] are included too ',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Budgets PATCH success. No content',
      },
      '422': { description: 'Failure, budgetId is unprocessable' },
    },
  })
  async updateBudgetsById(
    @param.path.number('budgetId', { required: true, example: 1 })
    budgetId: typeof Budgets.prototype.budgetId,
    @requestBody({
      description: 'Just desired properties',
      content: {
        'application/json': {
          schema: getModelSchemaRef(Budgets, {
            partial: true,
            exclude: ['budgetId', 'createdAt'],
            optional: ['userId'],
          }),
          examples: {
            CategoryBudget: {
              value: {
                title: 'My Category Budget',
                date: 139907,
                budgetAmount: 700000,
                calendar: 'jalali',
                currency: 'IRT',
                userRelId: 0,
                categoryId: 1,
                groupId: 0,
              },
            },
            UserRelBudget: {
              value: {
                title: 'My UserRel Budget',
                date: 139907,
                budgetAmount: 700000,
                calendar: 'jalali',
                currency: 'IRT',
                userRelId: 1,
                categoryId: 0,
                groupId: 0,
              },
            },
            GroupBudget: {
              value: {
                title: 'My Group Budget',
                date: 139907,
                calendar: 'jalali',
                budgetAmount: 700000,
                currency: 'IRT',
                userRelId: 0,
                categoryId: 0,
                groupId: 1,
              },
            },
          },
        },
      },
    })
    patchBudget: Budgets,
  ): Promise<void> {
    await this.budgetsRepository.updateById(budgetId, patchBudget);
  }

  @del('/budgets/{budgetId}', {
    summary: 'DELETE a Budget by budgetId',
    description: 'Budgets belongs to [Group, Category, UserRel] are included too ',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Budgets DELETE success. No content',
      },
      '422': { description: 'Failure, budgetId is unprocessable' },
    },
  })
  async deleteBudgetsById(
    @param.path.number('budgetId', { required: true, example: 1 })
    budgetId: typeof Budgets.prototype.budgetId,
  ): Promise<void> {
    await this.budgetsRepository.deleteById(budgetId);
  }

  @del('/budgets/', {
    summary: 'DELETE all Budgets ',
    description: 'Budgets belongs to [Group, Category, UserRel] are included too ',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Count DELETE Budgets',
        content: {
          'application/json': {
            schema: CountSchema,
          },
        },
      },
    },
  })
  async deleteAllBudgets(): Promise<Count> {
    return this.budgetsRepository.deleteAll({ userId: this.userId });
  }
}
