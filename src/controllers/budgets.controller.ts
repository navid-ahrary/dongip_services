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
@api({basePath: '/budgets/', paths: {}})
@intercept(ValidateBudgetIdInterceptor.BINDING_KEY)
export class BudgetsController {
  readonly userId: number;

  constructor(
    @repository(BudgetsRepository) public budgetsRepository: BudgetsRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {
    this.userId = +this.currentUserProfile[securityId];
  }

  @get('/', {
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
  async findBudgets(): Promise<Budgets[]> {
    return this.budgetsRepository.find({where: {userId: this.userId}});
  }

  @post('/', {
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
      description:
        'currency and calendar properties are optional.' +
        'The values are equal to IRT and hijri, respectively',
      content: {
        'application/json': {
          schema: getModelSchemaRef(Budgets, {
            title: 'NewBudgets',
            exclude: ['budgetId', 'createdAt', 'updatedAt'],
            optional: ['userId'],
          }),

          examples: {
            CategoryBudget: {
              summary: 'Iran toman currency and jalali calendar',
              value: {
                title: 'My Category Budget',
                date: 139907,
                calendar: 'jalali',
                budgetAmount: 700000,
                currency: 'IRT',
                userRelId: 0,
                categoryId: 1,
                groupId: 0,
              },
            },
            UserRelBudget: {
              summary: 'Dubai dirham currency and hijri calendar',
              value: {
                title: 'My UserRel Budget',
                date: 144209,
                calendar: 'hijri',
                budgetAmount: 700000,
                currency: 'AED',
                userRelId: 1,
                categoryId: 0,
                groupId: 0,
              },
            },
            GroupBudget: {
              summary: 'US dollar currency and gregorian calendar',
              value: {
                title: 'My Group Budget',
                date: 202009,
                calendar: 'gregorian',
                budgetAmount: 700000,
                currency: 'USD',
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
  ): Promise<Budgets> {
    newBudget.userId = this.userId;

    return this.budgetsRepository.create(newBudget);
  }

  @patch('/{budgetId}', {
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
    patchBudget.updatedAt = new Date().toISOString();
    await this.budgetsRepository.updateById(budgetId, patchBudget);
  }

  @del('/{budgetId}', {
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

  @del('/', {
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
  async deleteAllBudgets(): Promise<Count> {
    return this.budgetsRepository.deleteAll({userId: this.userId});
  }
}
