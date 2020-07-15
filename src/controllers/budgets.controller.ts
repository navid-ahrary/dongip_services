import {repository, Count, CountSchema} from '@loopback/repository';
import {
  param,
  get,
  getModelSchemaRef,
  patch,
  del,
  requestBody,
  api,
  post,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {inject, intercept} from '@loopback/core';
import {authenticate} from '@loopback/authentication';

import {Budgets} from '../models';
import {BudgetsRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {ValidateBudgetIdInterceptor} from '../interceptors';

@authenticate('jwt.access')
@api({basePath: '/api/', paths: {}})
@intercept(ValidateBudgetIdInterceptor.BINDING_KEY)
export class BudgetsController {
  readonly userId: number;

  constructor(
    @repository(BudgetsRepository) public budgetsRepository: BudgetsRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

  @get('/budgets', {
    summary: 'GET all Budgets',
    description:
      'Budgets belongs to [Group, Category, UserRel] are included too',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Budgets model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Budgets, {includeRelations: false}),
            },
          },
        },
      },
    },
  })
  async findBudgets(
    @param.header.string('firebase-token') firebaseToken: string,
  ): Promise<Budgets[]> {
    return this.budgetsRepository.find({where: {userId: this.userId}});
  }

  @post('/budgets', {
    summary: 'POST a Budget for all expenses',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Budgets model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Budgets, {includeRelations: false}),
          },
        },
      },
    },
  })
  async createBudgets(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Budgets, {
            title: 'NewBudgets',
            exclude: ['budgetId', 'createdAt', 'updatedAt'],
            optional: ['userId'],
          }),
          examples: {
            CategoryBudget: {
              value: {
                title: 'My Category Budget',
                date: 139907,
                budgetAmount: 700000,
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
                userRelId: 1,
                categoryId: 0,
                groupId: 0,
              },
            },
            GroupBudget: {
              value: {
                title: 'My Group Budget',
                date: 139907,
                budgetAmount: 700000,
                userRelId: 0,
                categoryId: 0,
                groupId: 1,
              },
            },
          },
        },
      },
    })
    newBudget: Omit<Budgets, 'budgetId'>,
    @param.header.string('firebase-token') firebaseToken: string,
  ): Promise<Budgets> {
    newBudget.userId = this.userId;

    return this.budgetsRepository.create(newBudget);
  }

  @patch('/budgets/{budgetId}', {
    summary: 'PATCH a Budget by budgetId',
    description:
      'Budgets belongs to [Group, Category, UserRel] are included too ',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Budgets PATCH success. No content',
      },
      '422': {description: 'Failure, budgetId is unprocessable'},
    },
  })
  async updateBudgetsById(
    @param.path.number('budgetId', {required: true, example: 1})
    budgetId: typeof Budgets.prototype.budgetId,
    @requestBody({
      description: 'Just desired properties',
      content: {
        'application/json': {
          schema: getModelSchemaRef(Budgets, {
            partial: true,
            exclude: ['budgetId', 'createdAt', 'updatedAt'],
            optional: ['userId'],
          }),
          examples: {
            CategoryBudget: {
              value: {
                title: 'My Category Budget',
                date: 139907,
                budgetAmount: 700000,
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
                userRelId: 1,
                categoryId: 0,
                groupId: 0,
              },
            },
            GroupBudget: {
              value: {
                title: 'My Group Budget',
                date: 139907,
                budgetAmount: 700000,
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
    @param.header.string('firebase-token') firebaseToken: string,
  ): Promise<void> {
    patchBudget.updatedAt = new Date().toISOString();
    await this.budgetsRepository.updateById(budgetId, patchBudget);
  }

  @del('/budgets/{budgetId}', {
    summary: 'DELETE a Budget by budgetId',
    description:
      'Budgets belongs to [Group, Category, UserRel] are included too ',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Budgets DELETE success. No content',
      },
      '422': {description: 'Failure, budgetId is unprocessable'},
    },
  })
  async deleteBudgetsById(
    @param.path.number('budgetId', {required: true, example: 1})
    budgetId: typeof Budgets.prototype.budgetId,
    @param.header.string('firebase-token') firebaseToken: string,
  ): Promise<void> {
    await this.budgetsRepository.deleteById(budgetId);
  }

  @del('/budgets', {
    summary: 'DELETE all Budgets ',
    description:
      'Budgets belongs to [Group, Category, UserRel] are included too ',
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
  async deleteAllBudgets(
    @param.header.string('firebase-token') firebaseToken: string,
  ): Promise<Count> {
    return this.budgetsRepository.deleteAll({userId: this.userId});
  }
}
