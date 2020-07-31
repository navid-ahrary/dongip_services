import {Filter, repository} from '@loopback/repository';
import {get, getModelSchemaRef, param, api} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';

import {inject} from '@loopback/core';
import {Notifications} from '../models';
import {UsersRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

@api({basePath: '/', paths: {}})
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
    summary: 'GET Notifications by filter in query',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Notifications',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Notifications, {
                includeRelations: false,
              }),
            },
          },
        },
      },
    },
  })
  async find(
    @param.query.object('filter', {
      example: {
        limit: 20,
        orders: ['createAt ASC'],
        where: {
          additionalProp1: {},
        },
      },
    })
    filter?: Filter<Notifications>,
  ): Promise<Notifications[]> {
    return this.usersRepository.notifications(this.userId).find(filter);
  }
}
