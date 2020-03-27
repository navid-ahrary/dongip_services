import {Filter, repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  param,
  post,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';

import {Users, CategoryBill} from '../models';
import {UsersRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

export class UsersCategoryBillController {
  constructor(
    @repository(UsersRepository) protected usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {}

  private checkUserKey(key: string) {
    if (key !== this.currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Token is not matched to this user _key!',
      );
    }
  }

  @get('api/users/{_userKey}/category-bills', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Users has many CategoryBill',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(CategoryBill)},
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async find(
    @param.path.string('_userKey') _userKey: typeof Users.prototype._key,
    @param.query.object('filter') filter?: Filter<CategoryBill>,
  ): Promise<CategoryBill[]> {
    this.checkUserKey(_userKey);

    const userId = 'Users/' + _userKey;
    return this.usersRepository.categoryBills(userId).find(filter);
  }

  @post('/api/users/{_userKey}/category-bills', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users model instance',
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
    @param.path.string('_userKey') _userKey: typeof Users.prototype._key,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CategoryBill, {
            title: 'NewCategoryBillInUsers',
            exclude: ['_key'],
            optional: ['_from'],
          }),
        },
      },
    })
    categoryBill: Omit<CategoryBill, '_key'>,
  ): Promise<CategoryBill> {
    this.checkUserKey(_userKey);

    const userId = 'Users/' + _userKey;
    return this.usersRepository.categoryBills(userId).create(categoryBill);
  }
}
