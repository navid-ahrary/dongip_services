import {Count, CountSchema, Filter, repository, Where} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest';
import {Categories} from '../models';
import {UsersRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';

export class UsersCategoriesController {
  constructor(@repository(UsersRepository) protected usersRepository: UsersRepository) {}

  @get('/users/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "Array of Categories's belonging to Users",
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Categories)},
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async find(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.query.object('filter')
    filter?: Filter<Categories>,
  ): Promise<Categories[]> {
    const userId = currentUser[securityId];
    return this.usersRepository.categories(userId).find(filter);
  }

  @post('/users/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users model instance',
        content: {'application/json': {schema: getModelSchemaRef(Categories)}},
      },
    },
  })
  @authenticate('jwt')
  async create(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Categories, {
            title: 'NewCategoriesInUsers',
            exclude: ['id'],
            optional: ['usersId'],
          }),
        },
      },
    })
    categories: Omit<Categories, 'id'>,
  ): Promise<Categories> {
    return this.usersRepository.categories(currentUser[securityId]).create(categories);
  }

  @patch('/users/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users.Categories PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate('jwt')
  async patch(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Categories, {partial: true}),
        },
      },
    })
    categories: Partial<Categories>,
    @param.query.object('where', getWhereSchemaFor(Categories)) where?: Where<Categories>,
  ): Promise<Count> {
    return this.usersRepository
      .categories(currentUser[securityId])
      .patch(categories, where);
  }

  @del('/users/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users.Categories DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate('jwt')
  async delete(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.query.object('where', getWhereSchemaFor(Categories)) where?: Where<Categories>,
  ): Promise<Count> {
    return this.usersRepository.categories(currentUser[securityId]).delete(where);
  }
}
