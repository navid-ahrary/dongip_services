import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  getModelSchemaRef,
  getWhereSchemaFor,
  patch,
  put,
  del,
  requestBody,
} from '@loopback/rest';
import {Dongs} from '../models';
import {DongsRepository} from '../repositories';

export class DongsController {
  constructor(
    @repository(DongsRepository)
    public dongsRepository: DongsRepository,
  ) {}

  @post('/dongs', {
    responses: {
      '200': {
        description: 'Dongs model instance',
        content: {'application/json': {schema: getModelSchemaRef(Dongs)}},
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dongs, {
            title: 'NewDongs',
            exclude: ['id'],
          }),
        },
      },
    })
    dongs: Omit<Dongs, 'id'>,
  ): Promise<Dongs> {
    return this.dongsRepository.create(dongs);
  }

  @get('/dongs/count', {
    responses: {
      '200': {
        description: 'Dongs model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @param.query.object('where', getWhereSchemaFor(Dongs)) where?: Where<Dongs>,
  ): Promise<Count> {
    return this.dongsRepository.count(where);
  }

  @get('/dongs', {
    responses: {
      '200': {
        description: 'Array of Dongs model instances',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Dongs)},
          },
        },
      },
    },
  })
  async find(
    @param.query.object('filter', getFilterSchemaFor(Dongs))
    filter?: Filter<Dongs>,
  ): Promise<Dongs[]> {
    console.log(filter);
    return this.dongsRepository.find(filter);
  }

  @patch('/dongs', {
    responses: {
      '200': {
        description: 'Dongs PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dongs, {partial: true}),
        },
      },
    })
    dongs: Dongs,
    @param.query.object('where', getWhereSchemaFor(Dongs)) where?: Where<Dongs>,
  ): Promise<Count> {
    return this.dongsRepository.updateAll(dongs, where);
  }

  @get('/dongs/{id}', {
    responses: {
      '200': {
        description: 'Dongs model instance',
        content: {'application/json': {schema: getModelSchemaRef(Dongs)}},
      },
    },
  })
  async findById(@param.path.string('id') id: string): Promise<Dongs> {
    return this.dongsRepository.findById(id);
  }

  @patch('/dongs/{id}', {
    responses: {
      '204': {
        description: 'Dongs PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dongs, {partial: true}),
        },
      },
    })
    dongs: Dongs,
  ): Promise<void> {
    await this.dongsRepository.updateById(id, dongs);
  }

  @put('/dongs/{id}', {
    responses: {
      '204': {
        description: 'Dongs PUT success',
      },
    },
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() dongs: Dongs,
  ): Promise<void> {
    await this.dongsRepository.replaceById(id, dongs);
  }

  @del('/dongs/{id}', {
    responses: {
      '204': {
        description: 'Dongs DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.dongsRepository.deleteById(id);
  }
}
