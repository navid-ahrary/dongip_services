import {Filter, repository} from '@loopback/repository';
import {get, getModelSchemaRef, param, api} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';

import {inject} from '@loopback/core';
import {Notifications} from '../models';
import {UsersRepository} from '../repositories';

@api({basePath: '/api/', paths: {}})
@authenticate('jwt.access')
export class NotificationsController {
  userId: number;

  constructor(
    @repository(UsersRepository) protected usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

  @get('/notifications', {
    responses: {
      '200': {
        description: 'Array of Users has many Notifications',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Notifications)},
          },
        },
      },
    },
  })
  async find(
    @param.filter(Notifications) filter?: Filter<Notifications>,
  ): Promise<Notifications[]> {
    return this.usersRepository.notifications(this.userId).find(filter);
  }
}
