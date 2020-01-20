import { repository } from '@loopback/repository';
import { param, get, getModelSchemaRef } from '@loopback/rest';
import { Dongs, Category } from '../models';
import { DongsRepository } from '../repositories';

export class DongsCategoryController {
  constructor(
    @repository(DongsRepository)
    public dongsRepository: DongsRepository,
  ) { }

  @get('/dongs/{_key}/category', {
    responses: {
      '200': {
        description: 'Category belonging to Dongs',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(Category) },
          },
        },
      },
    },
  })
  async getCategory(
    @param.path.string('_key') _key: typeof Dongs.prototype._key,
  ): Promise<Category> {
    return this.dongsRepository.category(_key);
  }
}
