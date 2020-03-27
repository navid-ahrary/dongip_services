import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {UserProfile, SecurityBindings} from '@loopback/security';

import {UsersRels, CategoryBill} from '../models';
import {UsersRelsRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

export class UsersRelsCategoryBillController {
  constructor(
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {}

  @get('/api/users-rels/{_relkey}/category-bills', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of UsersRels has many CategoryBill',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(CategoryBill),
            },
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async find(
    @param.path.string('_relkey') _relkey: string,
    @param.query.object('filter') filter?: Filter<CategoryBill>,
  ): Promise<CategoryBill[]> {
    const relId = 'UsersRels/' + _relkey;
    return this.usersRelsRepository.categoryBills(relId).find(filter);
  }

  @post('/api/users-rels/{_relkey}/category-bills', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'UsersRels model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(CategoryBill),
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async create(
    @param.path.string('_relkey') _relkey: typeof UsersRels.prototype._key,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CategoryBill, {
            title: 'NewCategoryBillInUsersRels',
            exclude: ['_key'],
            optional: ['belongsToUserRelsId'],
          }),
        },
      },
    })
    categoryBill: Omit<CategoryBill, '_key'>,
  ): Promise<CategoryBill> {
    const relId = 'UsersRels/' + _relkey;
    return this.usersRelsRepository.categoryBills(relId).create(categoryBill);
  }

  @patch('/api/users-rels/{_relkey}/category-bills', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'UsersRels.CategoryBill PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate('jwt.access')
  async patch(
    @param.path.string('_relkey') _relkey: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CategoryBill, {partial: true}),
        },
      },
    })
    categoryBill: Partial<CategoryBill>,
    @param.query.object('where', getWhereSchemaFor(CategoryBill))
    where?: Where<CategoryBill>,
  ): Promise<Count> {
    const relId = 'UsersRels/' + _relkey;
    return this.usersRelsRepository
      .categoryBills(relId)
      .patch(categoryBill, where);
  }
}
