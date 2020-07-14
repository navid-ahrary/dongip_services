import {repository} from '@loopback/repository';
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

import {Budgets, UsersRels} from '../models';
import {UsersRelsRepository} from '../repositories';
import {ValidateUsersRelsInterceptor} from '../interceptors';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

@api({basePath: '/api/', paths: {}})
@authenticate('jwt.access')
@intercept(ValidateUsersRelsInterceptor.BINDING_KEY)
export class UsersRelsBudgetsController {
  readonly userId: number;

  constructor(
    @repository(UsersRelsRepository)
    protected usersRelsRepository: UsersRelsRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

  @get('/users-rels/{userRelId}/budgets', {
    summary: 'GET an array of Budget belongs to a UsersRels by userRelId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Budgets',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Budgets, {
                exclude: ['groupId', 'categoryId'],
              }),
            },
          },
        },
      },
      '422': {description: 'Failure, userRelId is unprocessable'},
    },
  })
  async findUsersRelsBudgets(
    @param.path.number('userRelId', {required: true, example: 1})
    userRelId: typeof UsersRels.prototype.userRelId,
  ): Promise<Budgets[]> {
    return this.usersRelsRepository.budgets(userRelId).find();
  }

  @post('/users-rels/{userRelId}/budgets', {
    summary: 'POST a Budget belongs to an UsersRels by userRelId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Success, Budgets model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Budgets, {
              includeRelations: false,
              exclude: ['groupId', 'categoryId'],
            }),
          },
        },
      },
      '422': {description: 'Failure, categoryId is unprocessable'},
    },
  })
  async createUsersRelsBudgets(
    @param.path.number('userRelId', {required: true, example: 1})
    userRelId: typeof UsersRels.prototype.userRelId,
    @requestBody({
      description: 'A Budget model instance belongs to an UsersRels',
      content: {
        'application/json': {
          schema: getModelSchemaRef(Budgets, {
            title: 'NewBudgetsInUsersRels',
            exclude: ['budgetId', 'createdAt', 'userId'],
            optional: ['userRelId'],
          }),
          example: {
            title: 'My UserRel budget',
            date: 139905,
            budgetAmount: 1500000,
            groupId: undefined,
            categoryId: undefined,
          },
        },
      },
    })
    newBudget: Omit<Budgets, 'budgetId'>,
  ): Promise<Budgets> {
    newBudget.userId = this.userId;
    delete newBudget.categoryId;
    delete newBudget.groupId;

    return this.usersRelsRepository.budgets(userRelId).create(newBudget);
  }
}
