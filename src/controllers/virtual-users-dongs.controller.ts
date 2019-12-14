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
import {VirtualUsers, Dongs} from '../models';
import {VirtualUsersRepository} from '../repositories';

export class VirtualUsersDongsController {
  constructor(
    @repository(VirtualUsersRepository)
    protected virtualUsersRepository: VirtualUsersRepository,
  ) {}

  @get('/virtual-users/{id}/dongs', {
    responses: {
      '200': {
        description: "Array of Dongs's belonging to VirtualUsers",
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
    return this.virtualUsersRepository.dongs(id).find(filter);
  }

  @post('/virtual-users/{id}/dongs', {
    responses: {
      '200': {
        description: 'VirtualUsers model instance',
        content: {'application/json': {schema: getModelSchemaRef(Dongs)}},
      },
    },
  })
  async create(
    @param.path.string('id') id: typeof VirtualUsers.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dongs, {
            title: 'NewDongsInVirtualUsers',
            exclude: ['id'],
            optional: ['virtualUsersId'],
          }),
        },
      },
    })
    dongs: Omit<Dongs, 'id'>,
  ): Promise<Dongs> {
    return this.virtualUsersRepository.dongs(id).create(dongs);
  }

  @patch('/virtual-users/{id}/dongs', {
    responses: {
      '200': {
        description: 'VirtualUsers.Dongs PATCH success count',
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
    return this.virtualUsersRepository.dongs(id).patch(dongs, where);
  }

  @del('/virtual-users/{id}/dongs', {
    responses: {
      '200': {
        description: 'VirtualUsers.Dongs DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async delete(
    @param.path.string('id') id: string,
    @param.query.object('where', getWhereSchemaFor(Dongs)) where?: Where<Dongs>,
  ): Promise<Count> {
    return this.virtualUsersRepository.dongs(id).delete(where);
  }
}
