/* eslint-disable @typescript-eslint/naming-convention */
import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
  RequestContext,
} from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import _ from 'lodash';
import { LocMsgsBindings } from '../keys';
import { Categories, Users } from '../models';
import { CategoriesRepository, UsersRepository } from '../repositories';
import { CurrentUserProfile } from '../services';
import { LocalizedMessages } from '../types';

@authenticate('jwt.access')
export class CategoriesController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly lang: string;

  constructor(
    @inject.context() private ctx: RequestContext,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(CategoriesRepository) public categoryRepository: CategoriesRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  @get('/categories', {
    summary: 'Get array of all category belongs to current user',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "Array of Categories's belonging to Users",
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(Categories) },
          },
        },
      },
    },
  })
  async find(): Promise<Categories[]> {
    return this.usersRepository.categories(this.userId).find({ where: { deleted: false } });
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
            exclude: ['categoryId', 'userId', 'deleted'],
          }),
          example: {
            title: 'مسافرت',
            icon: 'assets/images/icons/travel/ic_normal_travel_03.png',
            parentCategoryId: 1,
          },
        },
      },
    })
    newCategories: Omit<Categories, 'categoryId'>,
  ): Promise<Categories> {
    const foundSameTitle = await this.categoryRepository.findOne({
      where: { userId: this.userId, title: newCategories.title, deleted: false },
    });

    if (foundSameTitle) {
      throw new HttpErrors.Conflict(this.locMsg['CONFLICT_CATEGORY_NAME'][this.lang]);
    }

    const createdCat: Categories = await this.usersRepository
      .categories(this.userId)
      .create(newCategories);

    return createdCat;
  }

  @patch('/categories/{categoryId}', {
    summary: 'Update a category by id',
    description: 'Just desired properties place in request body',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': { description: 'Category PATCH success, no content' },
      '422': {
        description: 'Categories DELETE failure, User has not this categoryId',
      },
    },
  })
  async patchCategoriesById(
    @param.path.number('categoryId', { required: true })
    categoryId: typeof Categories.prototype.categoryId,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Categories, {
            partial: true,
            exclude: ['categoryId', 'userId', 'deleted'],
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
                parentCategoryId: 2,
              },
            },
          },
        },
      },
    })
    category: Partial<Categories>,
  ): Promise<void> {
    await this.usersRepository
      .categories(this.userId)
      .patch(category, { categoryId: categoryId })
      .then(result => {
        if (!result.count) {
          const errMsg = this.locMsg['CATEGORY_NOT_VALID'][this.lang];
          throw new HttpErrors.UnprocessableEntity(errMsg);
        }
      })
      .catch(err => {
        // Duplicate title error handling
        if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
          const errMsg = this.locMsg['CONFLICT_CATEGORY_NAME'][this.lang];
          throw new HttpErrors.Conflict(errMsg);
        }
        throw new HttpErrors.NotAcceptable(err.message);
      });
  }

  @del('/categories/{categoryId}', {
    summary: 'DELETE a Category by id',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': { description: 'Caregories DELETE success, no content' },
      '422': {
        description: 'Categories DELETE failure, User has not this categoryId',
      },
    },
  })
  async deleteCategoriesById(
    @param.path.number('categoryId', { required: true, allowEmptyValue: false })
    categoryId: typeof Categories.prototype.categoryId,
  ): Promise<void> {
    await this.usersRepository
      .dongs(this.userId)
      .patch({ deleted: true }, { categoryId: categoryId });

    await this.usersRepository
      .categories(this.userId)
      .patch({ deleted: true }, { categoryId: categoryId });
  }

  @del('/categories', {
    summary: "Delete all user's Categories ",
    security: OPERATION_SECURITY_SPEC,
    responses: { '200': { description: 'Count deleted Categories' } },
  })
  async deleteAllCategories() {
    await this.usersRepository.dongs(this.userId).patch({ deleted: true });
    return this.usersRepository.categories(this.userId).patch({ deleted: true });
  }
}
