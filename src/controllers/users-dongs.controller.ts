/* eslint-disable @typescript-eslint/no-unused-vars */
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
  HttpErrors,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {Users, Dongs} from '../models';
import {UsersRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';

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
  async find(
    @param.path.string('id') id: string,
    @param.query.object('filter') filter?: Filter<Dongs>,
  ): Promise<Dongs[]> {
    return this.usersRepository.dongs(id).find(filter);
  }

  @post('/apis/users/{id}/dongs', {
    responses: {
      '200': {
        description: 'Users model instance',
        content: {'application/json': {schema: getModelSchemaRef(Dongs)}},
      },
    },
  })
  @authenticate('jwt')
  async create(
    @param.path.string('id') id: typeof Users.prototype.id,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dongs, {
            title: 'NewDongForNodes',
            exclude: ['id'],
            optional: ['desc'],
          }),
        },
      },
    })
    dongs: Omit<Dongs, 'id'>,
  ): Promise<Dongs> {
    try {
      let pong = 0;
      let factorNodes = 0;

      for (const item of dongs.eqip) {
        pong += item['paidCost'];
        factorNodes += item['factor'];
      }

      dongs.pong = pong;

      const dong = pong / factorNodes;

      for (const n of dongs.eqip) {
        n.dong = dong * n.factor;
      }

      console.log(dongs);

      return this.usersRepository.dongs(id).create(dongs);
    } catch (err) {
      throw new HttpErrors.NotImplemented(err);
    }
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
