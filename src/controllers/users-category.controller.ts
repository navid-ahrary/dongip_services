import { Count, CountSchema, Filter, repository, Where } from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import { Users, Category } from '../models';
import { UsersRepository } from '../repositories';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs';
import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/core';

export class UsersCategoryController {
  constructor(@repository(UsersRepository) protected usersRepository: UsersRepository) { }

  @get('/apis/users/{_id}/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "Array of Category's belonging to Users",
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(Category) },
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async find(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_id') _id: string,
    @param.query.object('filter') filter?: Filter<Category>,
  ): Promise<Category[]> {
    if (_id !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error find category, Token is not matched to this user _id!',
      );
    }

    return this.usersRepository.categories(_id).find(filter);
  }

  @post('/apis/users/{_id}/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users model instance',
        content: { 'application/json': { schema: getModelSchemaRef(Category) } },
      },
    },
  })
  @authenticate('jwt')
  async create(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_id') _id: typeof Users.prototype._id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {
            title: 'NewCategoryInUsers',
            exclude: ['_id'],
            optional: ['usersId'],
          }),
        },
      },
    })
    category: Omit<Category, '_id'>,
  ): Promise<Category> {
    if (_id !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error create a category, Token is not matched to this user _id!',
      );
    }

    const usersCategoriesWithThisName = await this.find(currentUserProfile, _id, {
      where: { name: category.name },
    });

    if (usersCategoriesWithThisName.length !== 0) {
      throw new HttpErrors.NotAcceptable(
        "conflict category's name, this category exists",
      );
    }

    return this.usersRepository.categories(_id).create(category);
  }

  @patch('/apis/users/{_id}/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users.Category PATCH success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  @authenticate('jwt')
  async patch(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_id') _id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, { partial: true }),
        },
      },
    })
    category: Partial<Category>,
    @param.query.object('where', getWhereSchemaFor(Category)) where?: Where<Category>,
  ): Promise<Count> {
    if (_id !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error find category, Token is not matched to this user _id!',
      );
    }

    return this.usersRepository.categories(_id).patch(category, where);
  }
}
