import {repository} from '@loopback/repository';
import {param, get, getModelSchemaRef} from '@loopback/rest';
import {Dongs, Users} from '../models';
import {DongsRepository} from '../repositories';

export class DongsUsersController {
  constructor(
    @repository(DongsRepository)
    public dongsRepository: DongsRepository,
  ) {}

  @get('/dongs/{id}/users', {
    responses: {
      '200': {
        description: 'Users belonging to Dongs',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Users)},
          },
        },
      },
    },
  })
  async getUsers(@param.path.string('id') id: typeof Dongs.prototype.id): Promise<Users> {
    return this.dongsRepository.users(id);
  }
}
