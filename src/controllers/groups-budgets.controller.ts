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

import {Budgets, Groups} from '../models';
import {GroupsRepository} from '../repositories';
import {ValidateGroupIdInterceptor} from '../interceptors';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

@api({basePath: '/api/', paths: {}})
@authenticate('jwt.access')
@intercept(ValidateGroupIdInterceptor.BINDING_KEY)
export class GroupsBudgetsController {
  readonly userId: number;

  constructor(
    @repository(GroupsRepository) protected groupsRepository: GroupsRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

  @get('/groups/{groupId}/budgets', {
    summary: 'GET an array of Budget belongs to a Groups by groupId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Budgets',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Budgets, {
                exclude: ['userRelId', 'categoryId'],
              }),
            },
          },
        },
      },
      '422': {description: 'Failure, groupId is unprocessable'},
    },
  })
  async findGroupsBudgets(
    @param.path.number('groupId', {required: true, example: 1})
    groupId: typeof Groups.prototype.groupId,
  ): Promise<Budgets[]> {
    return this.groupsRepository.budgets(groupId).find();
  }

  @post('/groups/{groupId}/budgets', {
    summary: 'POST a Budget belongs to an Groups by groupId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Success, Budgets model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Budgets, {
              includeRelations: false,
              exclude: ['userRelId', 'categoryId'],
            }),
          },
        },
      },
      '422': {description: 'Failure, groupId is unprocessable'},
    },
  })
  async createGroupsBudgets(
    @param.path.number('groupId', {required: true, example: 1})
    groupId: typeof Groups.prototype.groupId,
    @requestBody({
      description: 'A Budget model instance belongs to a Groups',
      content: {
        'application/json': {
          schema: getModelSchemaRef(Budgets, {
            title: 'NewBudgetsInUsersRels',
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
            title: 'My Group budget',
            date: 139907,
            budgetAmount: 5000000,
          },
        },
      },
    })
    newBudget: Omit<Budgets, 'budgetId'>,
  ): Promise<Budgets> {
    newBudget.userId = this.userId;
    return this.groupsRepository.budgets(groupId).create(newBudget);
  }
}
