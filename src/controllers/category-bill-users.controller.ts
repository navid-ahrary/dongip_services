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
  Users,
} from '../models';
import {CategoryBillRepository} from '../repositories';

export class CategoryBillUsersController {
  constructor(
    @repository(CategoryBillRepository)
    public categoryBillRepository: CategoryBillRepository,
  ) { }

  @get('/category-bills/{id}/users', {
    responses: {
      '200': {
        description: 'Users belonging to CategoryBill',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Users)},
          },
        },
      },
    },
  })
  async getUsers(
    @param.path.string('id') id: typeof CategoryBill.prototype._key,
  ): Promise<Users> {
    return this.categoryBillRepository.users(id);
  }
}
