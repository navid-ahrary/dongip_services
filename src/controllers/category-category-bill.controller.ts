import {Filter, repository} from '@loopback/repository';
import {get, getModelSchemaRef, param, post, requestBody} from '@loopback/rest';
import {UserProfile, SecurityBindings} from '@loopback/security';
import {Category, CategoryBill} from '../models';
import {CategoryRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';

export class CategoryCategoryBillController {
  constructor(
    @repository(CategoryRepository) protected categoryRepository: CategoryRepository,
  ) {}

  @get('/apis/categories/{id}/category-bills', {
    responses: {
      '200': {
        description: "Array of CategoryBill's belonging to Category",
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(CategoryBill)},
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async find(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('id') id: string,
    @param.query.object('filter') filter?: Filter<CategoryBill>,
  ): Promise<CategoryBill[]> {
    return this.categoryRepository.categoryBills(id).find(filter);
  }

  @post('/categories/{id}/category-bills', {
    responses: {
      '200': {
        description: 'Category model instance',
        content: {'application/json': {schema: getModelSchemaRef(CategoryBill)}},
      },
    },
  })
  async create(
    @param.path.string('id') id: typeof Category.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CategoryBill, {
            title: 'NewCategoryBillInCategory',
            exclude: ['id'],
            optional: ['categoryId'],
          }),
        },
      },
    })
    categoryBill: Omit<CategoryBill, 'id'>,
  ): Promise<CategoryBill> {
    return this.categoryRepository.categoryBills(id).create(categoryBill);
  }
}
