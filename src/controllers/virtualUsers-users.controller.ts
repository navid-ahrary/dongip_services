import {
  repository,
} from '@loopback/repository';
import {
  param,
  get,
  getModelSchemaRef,
} from '@loopback/rest';
import {
  VirtualUsers,
  Users,
} from '../models';
import {VirtualUsersRepository} from '../repositories';

export class VirtualUsersUsersController {
  constructor(
    @repository(VirtualUsersRepository)
    public virtualUsersRepository: VirtualUsersRepository,
  ) { }

  @get('/virtual-users/{id}/users', {
    responses: {
      '200': {
        description: 'Users belonging to VirtualUsers',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Users)},
          },
        },
      },
    },
  })
  async getUsers(
    @param.path.string('id') id: typeof VirtualUsers.prototype.id,
  ): Promise<Users> {
    return this.virtualUsersRepository.users(id);
  }
}
