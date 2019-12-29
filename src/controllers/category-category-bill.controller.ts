import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
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
import {
  Category,
  CategoryBill,
} from '../models';
import {CategoryRepository} from '../repositories';

export class CategoryCategoryBillController {
  constructor(
    @repository(CategoryRepository) protected categoryRepository: CategoryRepository,
  ) { }

  @get('/categories/{id}/category-bills', {
    responses: {
      '200': {
        description: 'Array of CategoryBill\'s belonging to Category',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(CategoryBill)},
          },
        },
      },
    },
  })
  async find(
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
            optional: ['categoryId']
          }),
        },
      },
    }) categoryBill: Omit<CategoryBill, 'id'>,
  ): Promise<CategoryBill> {
    return this.categoryRepository.categoryBills(id).create(categoryBill);
  }

  @patch('/categories/{id}/category-bills', {
    responses: {
      '200': {
        description: 'Category.CategoryBill PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async patch(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CategoryBill, {partial: true}),
        },
      },
    })
    categoryBill: Partial<CategoryBill>,
    @param.query.object('where', getWhereSchemaFor(CategoryBill)) where?: Where<CategoryBill>,
  ): Promise<Count> {
    return this.categoryRepository.categoryBills(id).patch(categoryBill, where);
  }

  @del('/categories/{id}/category-bills', {
    responses: {
      '200': {
        description: 'Category.CategoryBill DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async delete(
    @param.path.string('id') id: string,
    @param.query.object('where', getWhereSchemaFor(CategoryBill)) where?: Where<CategoryBill>,
  ): Promise<Count> {
    return this.categoryRepository.categoryBills(id).delete(where);
  }
}
