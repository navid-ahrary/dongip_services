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
import {User} from '../models';
import {UsersRepository} from '../repositories';

export class UsersController {
  constructor(
    @repository(UsersRepository)
    public usersRepository: UsersRepository,
  ) {}

  @post('/user', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/x-www-form-urlencoded': {
            schema: getModelSchemaRef(User),
          },
        },
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/x-www-form-urlencoded': {
          schema: getModelSchemaRef(User, {
            title: 'NewUsers',
          }),
        },
      },
    })
    user: User,
  ): Promise<User> {
    return this.usersRepository.create(user);
  }

  @get('/user/count', {
    responses: {
      '200': {
        description: 'User model count',
        content: {'application/x-www-form-urlencoded': {schema: CountSchema}},
      },
    },
  })
  async count(
    @param.query.object('where', getWhereSchemaFor(User)) where?: Where<User>,
  ): Promise<Count> {
    // console.log(where);
    const count = await this.usersRepository.count(where);
    console.log(count);
    return count;
  }

  @get('/user', {
    responses: {
      '200': {
        description: 'Array of User model instances',
        content: {
          'application/x-www-form-urlencoded': {
            schema: {type: 'array', items: getModelSchemaRef(User)},
          },
        },
      },
    },
  })
  async find(
    @param.query.object('filter', getFilterSchemaFor(User))
    filter?: Filter<User>,
  ): Promise<User[]> {
    const result = this.usersRepository.find(filter);
    console.log(result);
    return result;
  }

  @patch('/user', {
    responses: {
      '200': {
        description: 'User PATCH success count',
        content: {'application/x-www-form-urlencoded': {schema: CountSchema}},
      },
    },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {partial: true}),
        },
      },
    })
    user: User,
    @param.query.object('where', getWhereSchemaFor(User)) where?: Where<User>,
  ): Promise<Count> {
    return this.usersRepository.updateAll(user, where);
  }

  @get('/user/{id}', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/x-www-form-urlencoded': {
            schema: getModelSchemaRef(User),
          },
        },
      },
    },
  })
  async findById(@param.path.string('id') id: string): Promise<User> {
    return this.usersRepository.findById(id);
  }

  @patch('/user/{id}', {
    responses: {
      '204': {
        description: 'User PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/x-www-form-urlencoded': {
          schema: getModelSchemaRef(User, {partial: true}),
        },
      },
    })
    user: User,
  ): Promise<void> {
    await this.usersRepository.updateById(id, user);
  }

  @put('/user/{id}', {
    responses: {
      '204': {
        description: 'User PUT success',
      },
    },
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() user: User,
  ): Promise<void> {
    await this.usersRepository.replaceById(id, user);
  }

  @del('/user/{id}', {
    responses: {
      '204': {
        description: 'User DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.usersRepository.deleteById(id);
  }
}
