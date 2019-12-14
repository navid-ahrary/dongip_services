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
  Users,
  VirtualUsers,
} from '../models';
import {UsersRepository} from '../repositories';

export class UsersVirtualUsersController {
  constructor(
    @repository(UsersRepository) protected usersRepository: UsersRepository,
  ) { }

  @get('/users/{id}/virtual-users', {
    responses: {
      '200': {
        description: 'Array of VirtualUsers\'s belonging to Users',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(VirtualUsers)},
          },
        },
      },
    },
  })
  async find(
    @param.path.string('id') id: string,
    @param.query.object('filter') filter?: Filter<VirtualUsers>,
  ): Promise<VirtualUsers[]> {
    return this.usersRepository.virtualUsers(id).find(filter);
  }

  @post('/users/{id}/virtual-users', {
    responses: {
      '200': {
        description: 'Users model instance',
        content: {'application/json': {schema: getModelSchemaRef(VirtualUsers)}},
      },
    },
  })
  async create(
    @param.path.string('id') id: typeof Users.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(VirtualUsers, {
            title: 'NewVirtualUsersInUsers',
            exclude: ['id'],
            optional: ['usersId']
          }),
        },
      },
    }) virtualUsers: Omit<VirtualUsers, 'id'>,
  ): Promise<VirtualUsers> {
    return this.usersRepository.virtualUsers(id).create(virtualUsers);
  }

  @patch('/users/{id}/virtual-users', {
    responses: {
      '200': {
        description: 'Users.VirtualUsers PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async patch(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(VirtualUsers, {partial: true}),
        },
      },
    })
    virtualUsers: Partial<VirtualUsers>,
    @param.query.object('where', getWhereSchemaFor(VirtualUsers)) where?: Where<VirtualUsers>,
  ): Promise<Count> {
    return this.usersRepository.virtualUsers(id).patch(virtualUsers, where);
  }

  @del('/users/{id}/virtual-users', {
    responses: {
      '200': {
        description: 'Users.VirtualUsers DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async delete(
    @param.path.string('id') id: string,
    @param.query.object('where', getWhereSchemaFor(VirtualUsers)) where?: Where<VirtualUsers>,
  ): Promise<Count> {
    return this.usersRepository.virtualUsers(id).delete(where);
  }
}
