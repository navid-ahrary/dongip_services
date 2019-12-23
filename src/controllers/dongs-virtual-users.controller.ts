import {
  repository,
} from '@loopback/repository';
import {
  param,
  get,
  getModelSchemaRef,
} from '@loopback/rest';
import {
  Dongs,
  VirtualUsers,
} from '../models';
import {DongsRepository} from '../repositories';

export class DongsVirtualUsersController {
  constructor(
    @repository(DongsRepository)
    public dongsRepository: DongsRepository,
  ) { }

  @get('/dongs/{id}/virtual-users', {
    responses: {
      '200': {
        description: 'VirtualUsers belonging to Dongs',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(VirtualUsers)},
          },
        },
      },
    },
  })
  async getVirtualUsers(
    @param.path.string('id') id: typeof Dongs.prototype.id,
  ): Promise<VirtualUsers> {
    return this.dongsRepository.virtualUsers(id);
  }
}
