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
import {UserProfile, SecurityBindings, securityId} from '@loopback/security';
import {Users, Dongs} from '../models';
import {UsersRepository} from '../repositories';
import {inject} from '@loopback/core';
import {authenticate} from '@loopback/authentication';

export class UsersDongsController {
  constructor(@repository(UsersRepository) protected usersRepository: UsersRepository) {}

  @get('/users/{id}/dongs', {
    responses: {
      '200': {
        description: "Array of Dongs's belonging to Users",
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Dongs)},
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async find(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('id') id: string,
    @param.query.object('filter') filter?: Filter<Dongs>,
  ): Promise<Dongs[]> {
    return this.usersRepository.dongs(id).find(filter);
  }

  @post('/users/{id}/dongs', {
    responses: {
      '200': {
        description: 'Users model instance',
        content: {'application/json': {schema: getModelSchemaRef(Dongs)}},
      },
    },
  })
  @authenticate('jwt')
  async create(
    @inject(SecurityBindings.USER) curretUserProfile: UserProfile,
    @param.path.string('id') id: typeof Users.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dongs, {
            title: 'NewDongsInUsers',
            exclude: ['id'],
            optional: ['usersId'],
          }),
        },
      },
    })
    dongs: Omit<Dongs, 'id'>,
  ): Promise<Dongs> {
    return this.usersRepository.dongs(id).create(dongs);
  }

  @patch('/users/{id}/dongs', {
    responses: {
      '200': {
        description: 'Users.Dongs PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async patch(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dongs, {partial: true}),
        },
      },
    })
    dongs: Partial<Dongs>,
    @param.query.object('where', getWhereSchemaFor(Dongs)) where?: Where<Dongs>,
  ): Promise<Count> {
    return this.usersRepository.dongs(id).patch(dongs, where);
  }

  @del('/users/{id}/dongs', {
    responses: {
      '200': {
        description: 'Users.Dongs DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async delete(
    @param.path.string('id') id: string,
    @param.query.object('where', getWhereSchemaFor(Dongs)) where?: Where<Dongs>,
  ): Promise<Count> {
    return this.usersRepository.dongs(id).delete(where);
  }
}
