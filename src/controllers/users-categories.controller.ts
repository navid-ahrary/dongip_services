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
  HttpErrors,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';

import {Category} from '../models';
import {UsersRepository, CategoryRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

export class UsersCategoriesController {
  constructor(
    @repository(UsersRepository)
    protected usersRepository: UsersRepository,
    @repository(CategoryRepository)
    protected categoryRepository: CategoryRepository,
    @inject(SecurityBindings.USER)
    protected currentUserProfile: UserProfile,
  ) {}

  private checkUserKey(key: string) {
    if (key !== this.currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Token is not matched to this user _key!',
      );
    }
  }

  @get('/api/users/categories', {
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
  @authenticate('jwt.access')
  async find(
    @param.query.object('filter') filter?: Filter<Category>,
  ): Promise<Category[]> {
    const _userKey = this.currentUserProfile[securityId];
    const userId = 'Users/' + _userKey;

    return this.usersRepository.categories(userId).find(filter);
  }

  @post('/api/users/categories', {
    summary: 'Create a new category',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'A category model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Category),
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async createCategory(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {
            title: 'NewCategory',
            partial: false,
            exclude: [
              '_key',
              '_id',
              '_rev',
              'categoryBills',
              'belongsToUserId',
            ],
          }),
          example: {
            title: 'مسافرت',
            icon: 'assets/images/icons/travel/ic_normal_travel_03.png',
          },
        },
      },
    })
    newCategories: Omit<Category, '_key'>,
  ): Promise<Category> {
    const _userKey = this.currentUserProfile[securityId];
    const userId = 'Users/' + _userKey;

    newCategories.belongsToUserId = userId;

    const createdCat = await this.categoryRepository
      .create(newCategories)
      .catch((_err) => {
        console.log('Error: ', _err[0].response.body.errorMessage);
        if (_err[0].code === 409) {
          const index = _err[0].response.body.errorMessage.indexOf(
            'conflicting',
          );

          throw new HttpErrors.Conflict(
            _err[0].response.body.errorMessage.slice(index),
          );
        } else {
          throw new HttpErrors.NotAcceptable(_err);
        }
      });
    return createdCat;
  }

  @post('/api/users/categories/bunch', {
    summary: 'Create bunch of new categories',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of categories model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Category),
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async createSomeCategories(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {
            title: 'NewCategories',
            partial: false,
            exclude: [
              '_key',
              '_id',
              '_rev',
              'categoryBills',
              'belongsToUserId',
            ],
          }),
          example: [
            {
              title: 'مسافرت',
              icon: 'assets/images/icons/travel/ic_normal_travel_03.png',
            },
          ],
        },
      },
    })
    newCategories: Omit<Category, '_key'>[],
  ): Promise<Category[]> {
    const _userKey = this.currentUserProfile[securityId];
    const userId = 'Users/' + _userKey;

    newCategories.forEach((cat) => {
      cat.belongsToUserId = userId;
    });

    const createdCat = await this.categoryRepository
      .createAll(newCategories)
      .catch((_err) => {
        console.log('Error: ', _err[0].response.body.errorMessage);
        if (_err[0].code === 409) {
          const index = _err[0].response.body.errorMessage.indexOf(
            'conflicting',
          );

          throw new HttpErrors.Conflict(
            _err[0].response.body.errorMessage.slice(index),
          );
        } else {
          throw new HttpErrors.NotAcceptable(_err);
        }
      });
    return createdCat;
  }

  @patch('/api/users/categories/{categoryKey}', {
    summary: 'Update a category by key in path',
    description:
      'برای تغییر در یک پراپرتی یا چند پراپ، فقط همان فیلدها مورد نظر با مقادیر تغییر یافته اش ارسال میشه',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users.Category PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate('jwt.access')
  async patch(
    @param.path.string('categoryKey')
    categoryKey: typeof Category.prototype._key,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {
            partial: true,
            exclude: ['_rev', '_id', '_key', 'belongsToUserId'],
          }),
          examples: {
            oneProp: {
              summary: 'مثالی برای تغییر تنها یک فیلد',
              value: {
                icon: 'assets/cat4/icon_3.png',
              },
            },
            multiProps: {
              summary: 'تغییر چند فیلد همزمان',
              value: {
                title: 'قسط',
                icon: 'assets/cat4/icon_3.png',
              },
            },
          },
        },
      },
    })
    category: Partial<Category>,
  ): Promise<Count> {
    const userKey = this.currentUserProfile[securityId];
    const userId = 'Users/' + userKey;

    try {
      return await this.usersRepository
        .categories(userId)
        .patch(category, {
          and: [{_key: categoryKey}, {belongsToUserId: userId}],
        });
    } catch (_err) {
      console.log(_err);
      if (_err.code === 409) {
        const index = _err.response.body.errorMessage.indexOf('conflicting');
        throw new HttpErrors.Conflict(
          _err.response.body.errorMessage.slice(index),
        );
      }
      throw new HttpErrors.NotAcceptable(_err.message);
    }
  }
}
