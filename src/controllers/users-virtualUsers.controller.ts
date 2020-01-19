import { Count, CountSchema, Filter, repository, Where } from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest';
import { Users, VirtualUsers } from '../models';
import { UsersRepository } from '../repositories';
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs';
import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';

export class UsersVirtualUsersController {
  constructor(@repository(UsersRepository) protected usersRepository: UsersRepository) { }

  @get('/apis/users/{_id}/virtual-users', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "Array of VirtualUsers's belonging to Users",
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(VirtualUsers) },
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async find(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_id') _id: string,
    @param.query.object('filter') filter?: Filter<VirtualUsers>,
  ): Promise<VirtualUsers[]> {
    currentUserProfile._id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];

    return this.usersRepository.virtualUsers(currentUserProfile._id).find(filter);
  }

  @post('/apis/users/{_id}/virtual-users', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users model instance',
        content: { 'application/json': { schema: getModelSchemaRef(VirtualUsers) } },
      },
    },
  })
  @authenticate('jwt')
  async create(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_id') _id: typeof Users.prototype._id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(VirtualUsers, {
            title: 'NewVirtualUsersInUsers',
            exclude: ['_id'],
            optional: ['usersId'],
          }),
        },
      },
    })
    virtualUsers: Omit<VirtualUsers, '_id'>,
  ): Promise<VirtualUsers> {
    currentUserProfile._id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];

    const user = await this.usersRepository.findById(currentUserProfile._id);

    const virtualUser = await this.usersRepository
      .virtualUsers(currentUserProfile._id)
      .create(virtualUsers);
    user.virtualFriends.push(virtualUser._id);

    return virtualUser;
  }

  @patch('/apis/users/{_id}/virtual-users', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users.VirtualUsers PATCH success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  @authenticate('jwt')
  async patch(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_id') _id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(VirtualUsers, { partial: true }),
        },
      },
    })
    virtualUsers: Partial<VirtualUsers>,
    @param.query.object('where', getWhereSchemaFor(VirtualUsers))
    where?: Where<VirtualUsers>,
  ): Promise<Count> {
    currentUserProfile._id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];

    return this.usersRepository
      .virtualUsers(currentUserProfile._id)
      .patch(virtualUsers, where);
  }
}
