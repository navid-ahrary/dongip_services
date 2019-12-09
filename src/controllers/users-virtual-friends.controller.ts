import {Count, CountSchema, Filter, repository, Where} from '@loopback/repository';
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
import {Users, VirtualFriends} from '../models';
import {UsersRepository} from '../repositories';

export class UsersVirtualFriendsController {
  constructor(@repository(UsersRepository) protected usersRepository: UsersRepository) {}

  @get('/users/{id}/virtual-friends', {
    responses: {
      '200': {
        description: "Array of VirtualFriends's belonging to Users",
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(VirtualFriends)},
          },
        },
      },
    },
  })
  async find(
    @param.path.string('id') id: string,
    @param.query.object('filter') filter?: Filter<VirtualFriends>,
  ): Promise<VirtualFriends[]> {
    return this.usersRepository.virtualFriends(id).find(filter);
  }

  @post('/users/{id}/virtual-friends', {
    responses: {
      '200': {
        description: 'Users model instance',
        content: {'application/json': {schema: getModelSchemaRef(VirtualFriends)}},
      },
    },
  })
  async create(
    @param.path.string('id') id: typeof Users.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(VirtualFriends),
        },
      },
    })
    virtualFriends: Omit<VirtualFriends, 'id'>,
  ): Promise<VirtualFriends> {
    return this.usersRepository.virtualFriends(id).create(virtualFriends);
  }

  @patch('/users/{id}/virtual-friends', {
    responses: {
      '200': {
        description: 'Users.VirtualFriends PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async patch(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(VirtualFriends, {partial: true}),
        },
      },
    })
    virtualFriends: Partial<VirtualFriends>,
    @param.query.object('where', getWhereSchemaFor(VirtualFriends))
    where?: Where<VirtualFriends>,
  ): Promise<Count> {
    return this.usersRepository.virtualFriends(id).patch(virtualFriends, where);
  }

  @del('/users/{id}/virtual-friends', {
    responses: {
      '200': {
        description: 'Users.VirtualFriends DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async delete(
    @param.path.string('id') id: string,
    @param.query.object('where', getWhereSchemaFor(VirtualFriends))
    where?: Where<VirtualFriends>,
  ): Promise<Count> {
    return this.usersRepository.virtualFriends(id).delete(where);
  }
}
