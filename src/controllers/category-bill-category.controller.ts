import {
  repository,
} from '@loopback/repository';
import {
  param,
  get,
  getModelSchemaRef,
} from '@loopback/rest';
import {
  CategoryBill,
  Category,
} from '../models';
import {CategoryBillRepository} from '../repositories';

export class CategoryBillCategoryController {
  constructor(
    @repository(CategoryBillRepository)
    public categoryBillRepository: CategoryBillRepository,
  ) { }

  @get('/category-bills/{id}/category', {
    responses: {
      '200': {
        description: 'Category belonging to CategoryBill',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Category)},
          },
        },
      },
    },
  })
  async getCategory(
    @param.path.string('id') id: typeof CategoryBill.prototype.id,
  ): Promise<Category> {
    return this.categoryBillRepository.category(id);
  }
}
