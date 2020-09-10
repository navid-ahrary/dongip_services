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
  Dongs,
  Scores,
} from '../models';
import {DongsRepository} from '../repositories';

export class DongsScoresController {
  constructor(
    @repository(DongsRepository) protected dongsRepository: DongsRepository,
  ) { }

  @get('/dongs/{id}/scores', {
    responses: {
      '200': {
        description: 'Array of Dongs has many Scores',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Scores)},
          },
        },
      },
    },
  })
  async find(
    @param.path.number('id') id: number,
    @param.query.object('filter') filter?: Filter<Scores>,
  ): Promise<Scores[]> {
    return this.dongsRepository.scores(id).find(filter);
  }

  @post('/dongs/{id}/scores', {
    responses: {
      '200': {
        description: 'Dongs model instance',
        content: {'application/json': {schema: getModelSchemaRef(Scores)}},
      },
    },
  })
  async create(
    @param.path.number('id') id: typeof Dongs.prototype.dongId,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Scores, {
            title: 'NewScoresInDongs',
            exclude: ['scoreId'],
            optional: ['dongId']
          }),
        },
      },
    }) scores: Omit<Scores, 'scoreId'>,
  ): Promise<Scores> {
    return this.dongsRepository.scores(id).create(scores);
  }

  @patch('/dongs/{id}/scores', {
    responses: {
      '200': {
        description: 'Dongs.Scores PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async patch(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Scores, {partial: true}),
        },
      },
    })
    scores: Partial<Scores>,
    @param.query.object('where', getWhereSchemaFor(Scores)) where?: Where<Scores>,
  ): Promise<Count> {
    return this.dongsRepository.scores(id).patch(scores, where);
  }

  @del('/dongs/{id}/scores', {
    responses: {
      '200': {
        description: 'Dongs.Scores DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async delete(
    @param.path.number('id') id: number,
    @param.query.object('where', getWhereSchemaFor(Scores)) where?: Where<Scores>,
  ): Promise<Count> {
    return this.dongsRepository.scores(id).delete(where);
  }
}
