import { Count, CountSchema, Filter, repository, Where } from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  getModelSchemaRef,
  getWhereSchemaFor,
  patch,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/core';
import underscore from 'underscore';
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs';
import { Dongs, Users } from '../models';
import { DongsRepository, UsersRepository } from '../repositories';

export class DongsController {
  constructor(
    @repository(DongsRepository)
    public dongsRepository: DongsRepository,
    @repository(UsersRepository)
    public usersRepository: UsersRepository,
  ) { }

  async isNodesUsersOrVirtualUsers(
    currentUserId: typeof Users.prototype._key,
    nodes: typeof Users.prototype._key[],
  ) {
    for (const node of nodes) {
      const user = await this.usersRepository.findById(node);
      if (!user) {
        const virtualUser = await this.usersRepository
          .virtualUsers(currentUserId)
          .find({ where: { _key: node } });
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
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Dongs model instance',
        content: { 'application/json': { schema: getModelSchemaRef(Dongs) } },
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
            exclude: ['_key'],
          }),
        },
      },
    })
    dongs: Omit<Dongs, '_key'>,
  ): Promise<Dongs> {
    let pong = 0;
    let factorNodes = 0;
    const nodes = [];

    for (const item of dongs.eqip) {
      nodes.push(item.node);
    }

    currentUserProfile._key = currentUserProfile[securityId];
    delete currentUserProfile[securityId];

    const expensesManager = await this.usersRepository.findById(currentUserProfile._key);

    if (!(await this.isNodesUsersOrVirtualUsers(currentUserProfile._key, nodes))) {
      throw new HttpErrors.NotAcceptable('Some of this users are not available');
    }

    for (const item of dongs.eqip) {
      if (
        item.node !== expensesManager._key.toString() &&
        !expensesManager.friends.includes(item.node) &&
        !this.arrayHasObject(expensesManager.pendingFriends, {
          recipient: expensesManager._key,
          requester: item.node,
        }) &&
        !this.arrayHasObject(expensesManager.pendingFriends, {
          recipient: item.node,
          requester: expensesManager._key,
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

    const transaction = await this.usersRepository
      .dongs(currentUserProfile._key)
      .create(dongs);

    expensesManager.dongsId.push(transaction._key);
    await this.usersRepository.updateById(expensesManager._key, expensesManager);

    for (const n of dongs.eqip) {
      if (n.node === expensesManager._key) continue;

      const user = await this.usersRepository.findById(n.node);
      user.dongsId.push(transaction._key);

      await this.usersRepository.updateById(n.node, user);
    }
    return transaction;
  }

  @get('/dongs/count', {
    responses: {
      '200': {
        description: 'Dongs model count',
        content: { 'application/json': { schema: CountSchema } },
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
            schema: { type: 'array', items: getModelSchemaRef(Dongs) },
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
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dongs, { partial: true }),
        },
      },
    })
    dongs: Dongs,
    @param.query.object('where', getWhereSchemaFor(Dongs)) where?: Where<Dongs>,
  ): Promise<Count> {
    return this.dongsRepository.updateAll(dongs, where);
  }

  @get('/dongs/{_key}', {
    responses: {
      '200': {
        description: 'Dongs model instance',
        content: { 'application/json': { schema: getModelSchemaRef(Dongs) } },
      },
    },
  })
  async findById(@param.path.string('_key') _key: string): Promise<Dongs> {
    return this.dongsRepository.findById(_key);
  }

  @patch('/dongs/{_key}', {
    responses: {
      '204': {
        description: 'Dongs PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('_key') _key: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dongs, { partial: true }),
        },
      },
    })
    dongs: Dongs,
  ): Promise<void> {
    await this.dongsRepository.updateById(_key, dongs);
  }
}
