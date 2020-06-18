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
  del,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject, intercept} from '@loopback/core';

import {Categories} from '../models';
import {UsersRepository, CategoriesRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {FirebasetokenInterceptor} from '../interceptors';

@api({
  basePath: '/api/',
  paths: {},
})
@intercept(FirebasetokenInterceptor.BINDING_KEY)
@authenticate('jwt.access')
export class CategoriesController {
  constructor(
    @repository(UsersRepository)
    protected usersRepository: UsersRepository,
    @repository(CategoriesRepository)
    protected categoryRepository: CategoriesRepository,
    @inject(SecurityBindings.USER)
    protected currentUserProfile: UserProfile,
  ) {}

  @get('/categories', {
    summary: 'Get array of all category belongs to current user',
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
  async find(
    @param.header.string('firebase-token') firebaseToken: string,
  ): Promise<Categories[]> {
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
            schema: getModelSchemaRef(Categories),
          },
        },
      },
    },
  })
  async createCategories(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Categories, {
            title: 'NewCategories',
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
    newCategories: Omit<Categories, '_key'>,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<Categories> {
    const userId = Number(this.currentUserProfile[securityId]);

    const createdCat: Categories = await this.usersRepository
      .categories(userId)
      .create(newCategories)
      .catch((err) => {
        // Duplicate title error handling
        if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
          throw new HttpErrors.Conflict(
            'این دسته بندی رو داری. یه اسم دیگه انتخاب کن',
          );
        } else {
          throw new HttpErrors.NotAcceptable(err);
        }
      });

    return createdCat;
  }

  @patch('/categories/{categoryId}', {
    summary: 'Update a category by id',
    description: 'Just desired properties place in request body',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Category PATCH success - No content',
      },
    },
  })
  async patch(
    @param.path.number('categoryId', {required: true})
    categoryId: typeof Categories.prototype.categoryId,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Categories, {
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
    category: Partial<Categories>,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<void> {
    const userId = Number(this.currentUserProfile[securityId]);

    await this.usersRepository
      .categories(userId)
      .patch(category, {categoryId: categoryId})
      .then((result) => {
        if (!result.count) {
          throw new HttpErrors.NotFound(
            'Entity not found: Category with id ' + categoryId,
          );
        }
      })
      .catch((err) => {
        // Duplicate title error handling
        if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
          throw new HttpErrors.Conflict('این اسم توی دسته بندی هات وجود داره!');
        }
        throw new HttpErrors.NotAcceptable(err.message);
      });
  }

  @del('/categories', {
    summary: "Delete all user's Categories ",
    security: OPERATION_SECURITY_SPEC,
    responses: {'200': {description: 'Count deleted Categories'}},
  })
  async deleteAllCategories() {
    const userId = Number(this.currentUserProfile[securityId]);
    return this.usersRepository.categories(userId).delete();
  }
}
