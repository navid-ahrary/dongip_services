import { Filter, repository } from '@loopback/repository';
import { get, getModelSchemaRef, param, post, requestBody } from '@loopback/rest';
import { UserProfile, SecurityBindings } from '@loopback/security';
import { Category, CategoryBill } from '../models';
import { CategoryRepository } from '../repositories';
import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/core';

export class CategoryCategoryBillController {
  constructor(
    @repository(CategoryRepository) protected categoryRepository: CategoryRepository,
  ) { }

  @get('/apis/categories/{_id}/category-bills', {
    responses: {
      '200': {
        description: "Array of CategoryBill's belonging to Category",
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(CategoryBill) },
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async find(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_id') _id: string,
    @param.query.object('filter') filter?: Filter<CategoryBill>,
  ): Promise<CategoryBill[]> {
    return this.categoryRepository.categoryBills(_id).find(filter);
  }

  @post('/categories/{_id}/category-bills', {
    responses: {
      '200': {
        description: 'Category model instance',
        content: { 'application/json': { schema: getModelSchemaRef(CategoryBill) } },
      },
    },
  })
  async create(
    @param.path.string('_id') _id: typeof Category.prototype._id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CategoryBill, {
            title: 'NewCategoryBillInCategory',
            exclude: ['_id'],
            optional: ['categoryId'],
          }),
        },
      },
    })
    categoryBill: Omit<CategoryBill, '_id'>,
  ): Promise<CategoryBill> {
    return this.categoryRepository.categoryBills(_id).create(categoryBill);
  }
}
