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
  JointAccountSubscribe,
} from '../models';
import {UsersRepository} from '../repositories';

export class UsersJointAccountSubscribeController {
  constructor(
    @repository(UsersRepository) protected usersRepository: UsersRepository,
  ) { }

  @get('/users/{id}/joint-account-subscribes', {
    responses: {
      '200': {
        description: 'Array of Users has many JointAccountSubscribe',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(JointAccountSubscribe)},
          },
        },
      },
    },
  })
  async find(
    @param.path.number('id') id: number,
    @param.query.object('filter') filter?: Filter<JointAccountSubscribe>,
  ): Promise<JointAccountSubscribe[]> {
    return this.usersRepository.jointAccountSubscribes(id).find(filter);
  }

  @post('/users/{id}/joint-account-subscribes', {
    responses: {
      '200': {
        description: 'Users model instance',
        content: {'application/json': {schema: getModelSchemaRef(JointAccountSubscribe)}},
      },
    },
  })
  async create(
    @param.path.number('id') id: typeof Users.prototype.userId,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(JointAccountSubscribe, {
            title: 'NewJointAccountSubscribeInUsers',
            exclude: ['jointSubscriberId'],
            optional: ['userId']
          }),
        },
      },
    }) jointAccountSubscribe: Omit<JointAccountSubscribe, 'jointSubscriberId'>,
  ): Promise<JointAccountSubscribe> {
    return this.usersRepository.jointAccountSubscribes(id).create(jointAccountSubscribe);
  }

  @patch('/users/{id}/joint-account-subscribes', {
    responses: {
      '200': {
        description: 'Users.JointAccountSubscribe PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async patch(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(JointAccountSubscribe, {partial: true}),
        },
      },
    })
    jointAccountSubscribe: Partial<JointAccountSubscribe>,
    @param.query.object('where', getWhereSchemaFor(JointAccountSubscribe)) where?: Where<JointAccountSubscribe>,
  ): Promise<Count> {
    return this.usersRepository.jointAccountSubscribes(id).patch(jointAccountSubscribe, where);
  }

  @del('/users/{id}/joint-account-subscribes', {
    responses: {
      '200': {
        description: 'Users.JointAccountSubscribe DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async delete(
    @param.path.number('id') id: number,
    @param.query.object('where', getWhereSchemaFor(JointAccountSubscribe)) where?: Where<JointAccountSubscribe>,
  ): Promise<Count> {
    return this.usersRepository.jointAccountSubscribes(id).delete(where);
  }
}
