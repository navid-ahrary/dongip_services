import {
  repository,
} from '@loopback/repository';
import {
  param,
  get,
  getModelSchemaRef,
} from '@loopback/rest';
import {
  Scores,
  Dongs,
} from '../models';
import {ScoresRepository} from '../repositories';

export class ScoresDongsController {
  constructor(
    @repository(ScoresRepository)
    public scoresRepository: ScoresRepository,
  ) { }

  @get('/scores/{id}/dongs', {
    responses: {
      '200': {
        description: 'Dongs belonging to Scores',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Dongs)},
          },
        },
      },
    },
  })
  async getDongs(
    @param.path.number('id') id: typeof Scores.prototype.scoreId,
  ): Promise<Dongs> {
    return this.scoresRepository.dong(id);
  }
}
