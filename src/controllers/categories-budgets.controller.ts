import {repository, Filter} from '@loopback/repository';
import {
  getModelSchemaRef,
  param,
  post,
  requestBody,
  api,
  get,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {inject, intercept} from '@loopback/core';
import {authenticate} from '@loopback/authentication';

import {Categories, Budgets} from '../models';
import {CategoriesRepository} from '../repositories';
import {ValidateCategoryIdInterceptor} from '../interceptors';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

@authenticate('jwt.access')
@intercept(ValidateCategoryIdInterceptor.BINDING_KEY)
@api({basePath: '/api/', paths: {}})
export class CategoriesBudgetsController {
  userId: number;

  constructor(
    @repository(CategoriesRepository)
    protected categoriesRepository: CategoriesRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

  @get('/categories/{categoryId}/budgets', {
    summary: 'GET an array of Budget belongs to a Category by categoryId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Budgets',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Budgets, {
                exclude: ['groupId', 'userRelId'],
              }),
            },
          },
        },
      },
      '422': {description: 'Failure, categoryId is unprocessable'},
    },
  })
  async findUsersRelsBudgets(
    @param.path.number('categoryId')
    categoryId: typeof Categories.prototype.categoryId,
  ): Promise<Budgets[]> {
    return this.categoriesRepository.budgets(categoryId).find();
  }

  @post('/categories/{categoryId}/budgets', {
    summary: 'POST a Budget belongs to a Category by categoryId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Success, Budgets model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Budgets, {
              includeRelations: false,
              exclude: ['groupId', 'userRelId'],
            }),
          },
        },
      },
      '422': {description: 'Failure, categoryId is unprocessable'},
    },
  })
  async createCategoriesBudgets(
    @param.path.number('categoryId', {required: true, example: 1})
    categoryId: typeof Categories.prototype.categoryId,
    @requestBody({
      description: 'A Budget model instance belongs to a Category',
      content: {
        'application/json': {
          schema: getModelSchemaRef(Budgets, {
            title: 'NewBudgetsInCategories',
            exclude: [
              'budgetId',
              'categoryId',
              'createdAt',
              'groupId',
              'userId',
              'userRelId',
            ],
          }),
          example: {
            title: 'My Category budget',
            date: 139905,
            budgetAmount: 500000,
          },
        },
      },
    })
    newBudget: Omit<Budgets, 'budgetId'>,
  ): Promise<Budgets> {
    newBudget.userId = this.userId;
    return this.categoriesRepository.budgets(categoryId).create(newBudget);
  }
}
