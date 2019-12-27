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
  HttpErrors,
} from '@loopback/rest';
import {Users, Category} from '../models';
import {UsersRepository} from '../repositories';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';

export class UsersCategoryController {
  constructor(@repository(UsersRepository) protected usersRepository: UsersRepository) {}

  @get('/apis/users/{id}/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "Array of Category's belonging to Users",
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Category)},
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async find(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('id') id: string,
    @param.query.object('filter') filter?: Filter<Category>,
  ): Promise<Category[]> {
    if (id !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error find category, Token is not matched to this user id!',
      );
    }

    return this.usersRepository.categories(id).find(filter);
  }

  @post('/apis/users/{id}/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users model instance',
        content: {'application/json': {schema: getModelSchemaRef(Category)}},
      },
    },
  })
  @authenticate('jwt')
  async create(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('id') id: typeof Users.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {
            title: 'NewCategoryInUsers',
            exclude: ['id'],
            optional: ['usersId'],
          }),
        },
      },
    })
    category: Omit<Category, 'id'>,
  ): Promise<Category> {
    if (id !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error create a category, Token is not matched to this user id!',
      );
    }

    const usersCategoriesWithThisName = await this.find(currentUserProfile, id, {
      where: {name: category.name},
    });

    if (usersCategoriesWithThisName.length !== 0) {
      throw new HttpErrors.NotAcceptable(
        "conflict category's name, this category exists",
      );
    }

    return this.usersRepository.categories(id).create(category);
  }

  @patch('/users/{id}/categories', {
    responses: {
      '200': {
        description: 'Users.Category PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async patch(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {partial: true}),
        },
      },
    })
    category: Partial<Category>,
    @param.query.object('where', getWhereSchemaFor(Category)) where?: Where<Category>,
  ): Promise<Count> {
    return this.usersRepository.categories(id).patch(category, where);
  }

  @del('/users/{id}/categories', {
    responses: {
      '200': {
        description: 'Users.Category DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async delete(
    @param.path.string('id') id: string,
    @param.query.object('where', getWhereSchemaFor(Category)) where?: Where<Category>,
  ): Promise<Count> {
    return this.usersRepository.categories(id).delete(where);
  }
}
