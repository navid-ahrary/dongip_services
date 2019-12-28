import {Filter, repository, Where, CountSchema, Count} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  requestBody,
  HttpErrors,
  getWhereSchemaFor,
  del,
} from '@loopback/rest';
import {Users, Dongs} from '../models';
import {UsersRepository} from '../repositories';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import * as underscore from 'underscore';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import * as admin from 'firebase-admin';
import debug = require('debug');

export class UsersDongsController {
  constructor(@repository(UsersRepository) private usersRepository: UsersRepository) {}

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

  @get('/apis/users/{id}/dongs', {
    security: OPERATION_SECURITY_SPEC,
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
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users.Dongs post model instance',
        content: {'application/json': {schema: getModelSchemaRef(Dongs)}},
      },
    },
  })
  @authenticate('jwt')
  async create(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('id') id: typeof Users.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dongs, {
            title: 'NewDongsInUsers',
            exclude: ['id'],
            optional: ['expensesManagerId'],
          }),
        },
      },
    })
    dongs: Omit<Dongs, 'id'>,
  ): Promise<void> {
    if (id !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error create a new dong, Token is not matched to this user id!',
      );
    }

    let pong = 0;
    let factorNodes = 0;
    const nodes = [];

    for (const item of dongs.eqip) {
      nodes.push(item.node);
    }

    const expensesManager = await this.usersRepository.findById(
      currentUserProfile[securityId],
    );

    if (!(await this.isNodesUsersOrVirtualUsers(currentUserProfile[securityId], nodes))) {
      throw new HttpErrors.NotAcceptable('Some of this users are not available');
    }

    for (const item of dongs.eqip) {
      if (
        item.node !== expensesManager.id.toString() &&
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

    const transaction = await this.usersRepository
      .dongs(currentUserProfile[securityId])
      .create(dongs);

    expensesManager.dongsId.push(transaction.id);
    await this.usersRepository.updateById(expensesManager.id, expensesManager);

    const category = await this.usersRepository.categories(id).find({
      where: {
        id: dongs.categoryId,
      },
    });

    category[0].bill = {dongId: transaction.id, dong: dong};

    console.log(category);

    const registrationTokens: string[] = [];

    for (const n of dongs.eqip) {
      if (n.node === expensesManager.id.toString()) continue;

      const node = await this.usersRepository.findById(n.node);
      node.dongsId.push(transaction.id);
      registrationTokens.push(node.registerationToken);

      await this.usersRepository.updateById(n.node, node);
    }

    // Generate notification message
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: 'دنگیپ دنگ جدید',
        body: `${dongs.categoryId} توسط ${expensesManager.name} دنگیپ شد`,
      },
      data: {
        name: expensesManager.name,
        id: expensesManager.id.toString(),
      },
      tokens: registrationTokens,
    };

    //send new dong notification to the nodes
    await admin
      .messaging()
      .sendMulticast(message)
      .then(function(response) {
        if (response.failureCount > 0) {
          const failedTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(registrationTokens[idx]);
            }
          });
          debug(`List of tokens that caused failure ${failedTokens}`);
          throw new HttpErrors.NotImplemented(
            `List of tokens that caused failure ${failedTokens}`,
          );
        }

        debug(`Successfully sent notifications, ${response}`);
        return {respose: response};
      })
      .catch(function(error) {
        debug(`Error sending notifications, ${error}`);
        throw new HttpErrors.NotImplemented(`Error sending notifications, ${error}`);
      });
  }

  @patch('/apis/users/{id}/dongs', {
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
