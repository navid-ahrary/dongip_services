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
  UsersRels,
} from '../models';
import {UsersRepository} from '../repositories';

export class UsersUsersRelsController {
  constructor(
    @repository(UsersRepository) protected usersRepository: UsersRepository,
  ) { }

  @get('/users/{id}/users-rels', {
    responses: {
      '200': {
        description: 'Array of Users has many UsersRels',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(UsersRels)},
          },
        },
      },
    },
  })
  async find(
    @param.path.string('id') id: string,
    @param.query.object('filter') filter?: Filter<UsersRels>,
  ): Promise<UsersRels[]> {
    return this.usersRepository.usersRels(id).find(filter);
  }

  @post('/users/{id}/users-rels', {
    responses: {
      '200': {
        description: 'Users model instance',
        content: {'application/json': {schema: getModelSchemaRef(UsersRels)}},
      },
    },
  })
  async create(
    @param.path.string('id') id: typeof Users.prototype._key,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(UsersRels, {
            title: 'NewUsersRelsInUsers',
            exclude: ['_key'],
            optional: ['usersId']
          }),
        },
      },
    }) usersRels: Omit<UsersRels, '_key'>,
  ): Promise<UsersRels> {
    return this.usersRepository.usersRels(id).create(usersRels);
  }

  @patch('/users/{id}/users-rels', {
    responses: {
      '200': {
        description: 'Users.UsersRels PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async patch(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(UsersRels, {partial: true}),
        },
      },
    })
    usersRels: Partial<UsersRels>,
    @param.query.object('where', getWhereSchemaFor(UsersRels)) where?: Where<UsersRels>,
  ): Promise<Count> {
    return this.usersRepository.usersRels(id).patch(usersRels, where);
  }

  @del('/users/{id}/users-rels', {
    responses: {
      '200': {
        description: 'Users.UsersRels DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async delete(
    @param.path.string('id') id: string,
    @param.query.object('where', getWhereSchemaFor(UsersRels)) where?: Where<UsersRels>,
  ): Promise<Count> {
    return this.usersRepository.usersRels(id).delete(where);
  }
}
