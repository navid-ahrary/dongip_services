import {Count, CountSchema, Filter, repository, Where} from '@loopback/repository';
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
  HttpErrors,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {Dongs, Users} from '../models';
import {DongsRepository, UsersRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import * as underscore from 'underscore';

export class DongsController {
  constructor(
    @repository(DongsRepository)
    public dongsRepository: DongsRepository,
    @repository(UsersRepository)
    public usersRepository: UsersRepository,
  ) {}

  async isNodesUsersOrVirtualUsers(
    currentUserId: typeof Users.prototype.id,
    nodes: typeof Users.prototype.id[],
  ) {
    for (const node of nodes) {
      const user = await this.usersRepository.findById(node);
      if (!user) {
        const virtualUser = await this.usersRepository
          .virtualUsers(currentUserId)
          .find({where: {id: node}});
        if (!virtualUser) {
          return false;
        }
      }
    }
    return true;
  }

  arrayHasObject(arr: object[], obj: object): boolean {
    for (const ele of arr) {
      if (underscore.isEqual(ele, obj)) {
        return true;
      }
    }
    return false;
  }

  @post('/apis/dongs', {
    responses: {
      '200': {
        description: 'Dongs model instance',
        content: {'application/json': {schema: getModelSchemaRef(Dongs)}},
      },
    },
  })
  @authenticate('jwt')
  async create(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
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
  ): Promise<void> {
    let pong = 0;
    let factorNodes = 0;
    const nodes = [];

    for (const item of dongs.eqip) {
      nodes.push(item.node);
    }

    currentUserProfile.id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];

    const expensesManager = await this.usersRepository.findById(currentUserProfile.id);
    dongs.expensesManger = expensesManager.id;

    if (!(await this.isNodesUsersOrVirtualUsers(currentUserProfile.id, nodes))) {
      throw new HttpErrors.NotAcceptable('Some of this users are not available');
    }

    for (const item of dongs.eqip) {
      if (
        item.node !== currentUserProfile.id &&
        !expensesManager.friends.includes(item.node) &&
        !this.arrayHasObject(expensesManager.pendingFriends, {
          recipient: expensesManager.id,
          requester: item.node,
        }) &&
        !this.arrayHasObject(expensesManager.pendingFriends, {
          recipient: item.node,
          requester: expensesManager.id,
        })
      ) {
        throw new HttpErrors.NotAcceptable(
          'Expenses manager must be friends with all nodes',
        );
      } else {
        pong += item['paidCost'];
        factorNodes += item['factor'];
      }
    }

    dongs.pong = pong;
    const dong = pong / factorNodes;
    for (const n of dongs.eqip) {
      n.dong = dong * n.factor;
    }

    const transaction = await this.dongsRepository.create(dongs);

    expensesManager.dongsId.push(transaction.id);
    await this.usersRepository.updateById(expensesManager.id, expensesManager);

    for (const n of dongs.eqip) {
      if (n.node === expensesManager.id) continue;

      const user = await this.usersRepository.findById(n.node);
      user.dongsId.push(transaction.id);

      await this.usersRepository.updateById(n.node, user);
    }
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
    @param.query.object('filter', getFilterSchemaFor(Dongs)) filter?: Filter<Dongs>,
  ): Promise<Dongs[]> {
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
