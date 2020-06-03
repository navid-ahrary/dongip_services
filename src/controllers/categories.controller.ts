import {repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  requestBody,
  HttpErrors,
  api,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';

import {Category} from '../models';
import {UsersRepository, CategoryRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

@api({
  basePath: '/api/',
  paths: {},
})
export class CategoriesController {
  constructor(
    @repository(UsersRepository)
    protected usersRepository: UsersRepository,
    @repository(CategoryRepository)
    protected categoryRepository: CategoryRepository,
    @inject(SecurityBindings.USER)
    protected currentUserProfile: UserProfile,
  ) {}

  @get('/categories', {
    summary: 'Get array of all category belongs to current user',
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
  async find(): // @param.query.object('filter') filter?: Filter<Category>,
  Promise<Category[]> {
    const userId = Number(this.currentUserProfile[securityId]);
    return this.usersRepository.categories(userId).find();
  }

  @post('/categories', {
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
            exclude: ['categoryId', 'userId'],
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
    const userId = Number(this.currentUserProfile[securityId]);

    newCategories.userId = userId;

    const createdCat = await this.categoryRepository
      .create(newCategories)
      .catch((err) => {
        // Duplicate userId and title error handling
        if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
          throw new HttpErrors.Conflict(
            'این دسته رو داری. یه اسم دیگه انتخاب کن',
          );
        } else {
          throw new HttpErrors.NotAcceptable(err);
        }
      });
    return createdCat;
  }

  // @post('/users/categories/bunch', {
  //   summary: 'Create bunch of new categories',
  //   security: OPERATION_SECURITY_SPEC,
  //   responses: {
  //     '200': {
  //       description: 'Array of categories model instance',
  //       content: {
  //         'application/json': {
  //           schema: getModelSchemaRef(Category),
  //         },
  //       },
  //     },
  //   },
  // })
  // @authenticate('jwt.access')
  // async createSomeCategories(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Category, {
  //           title: 'NewCategories',
  //           partial: false,
  //           exclude: ['categoryId', 'userId'],
  //         }),
  //         example: [
  //           {
  //             title: 'مسافرت',
  //             icon: 'assets/images/icons/travel/ic_normal_travel_03.png',
  //           },
  //         ],
  //       },
  //     },
  //   })
  //   newCategories: Omit<Category, '_key'>[],
  // ): Promise<Category[]> {
  //   const userId = Number(this.currentUserProfile[securityId]);

  //   newCategories.forEach((cat) => {
  //     cat.userId = userId;
  //   });

  //   const createdCat = await this.categoryRepository
  //     .createAll(newCategories)
  //     .catch((err) => {
  //       // Duplicate userId and title error handling
  //       if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
  //         throw new HttpErrors.Conflict(err.message);
  //       } else {
  //         throw new HttpErrors.NotAcceptable(err.message);
  //       }
  //     });
  //   return createdCat;
  // }

  @patch('/categories/{categoryId}', {
    summary: 'Update a category by id',
    description: 'Just desired properties place in request body',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Users.Category PATCH success count - No content',
      },
    },
  })
  @authenticate('jwt.access')
  async patch(
    @param.path.number('categoryId')
    categoryId: typeof Category.prototype.categoryId,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {
            partial: true,
            exclude: ['categoryId', 'userId'],
          }),
          examples: {
            oneProp: {
              summary: 'single property',
              value: {
                icon: 'assets/cat4/icon_3.png',
              },
            },
            multiProps: {
              summary: 'some properties',
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
  ): Promise<void> {
    const userId = Number(this.currentUserProfile[securityId]);

    const count = await this.usersRepository
      .categories(userId)
      .patch(category, {
        and: [{categoryId: categoryId}],
      })
      .catch((err) => {
        // Duplicate properties error handling
        if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
          throw new HttpErrors.Conflict(
            'این دسته رو داری. یه اسم دیگه انتخاب کن',
          );
        }
        throw new HttpErrors.NotAcceptable(err.message);
      });

    if (!count.count) {
      throw new HttpErrors.NotFound(
        'Entity not found: Category with id ' + categoryId,
      );
    }
  }
}
