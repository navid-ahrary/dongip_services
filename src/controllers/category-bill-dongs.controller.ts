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
  Dongs,
} from '../models';
import {CategoryBillRepository} from '../repositories';

export class CategoryBillDongsController {
  constructor(
    @repository(CategoryBillRepository)
    public categoryBillRepository: CategoryBillRepository,
  ) { }

  @get('/category-bills/{id}/dongs', {
    responses: {
      '200': {
        description: 'Dongs belonging to CategoryBill',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Dongs)},
          },
        },
      },
    },
  })
  async getDongs(
    @param.path.string('id') id: typeof CategoryBill.prototype.id,
  ): Promise<Dongs> {
    return this.categoryBillRepository.dongs(id);
  }
}
