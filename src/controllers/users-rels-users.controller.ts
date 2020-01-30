import {
  repository,
} from '@loopback/repository';
import {
  param,
  get,
  getModelSchemaRef,
} from '@loopback/rest';
import {
  UsersRels,
  Users,
} from '../models';
import { UsersRelsRepository } from '../repositories';

export class UsersRelsUsersController {
  constructor(
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
  ) { }

  @get('/apis/users-rels/{_key}/users', {
    responses: {
      '200': {
        description: 'Users belonging to UsersRels',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(Users) },
          },
        },
      },
    },
  })
  async getUsers(
    @param.path.string('_key') _key: typeof UsersRels.prototype._key,
  ): Promise<Users> {
    return this.usersRelsRepository.users(_key);
  }
}
