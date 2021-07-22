import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { inject, intercept } from '@loopback/core';
import { Filter, repository } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { HeadersInterceptor } from '../interceptors';
import { Notifications, Users } from '../models';
import { NotificationsRepository, UsersRepository } from '../repositories';
import { CurrentUserProfile } from '../services';

@intercept(HeadersInterceptor.BINDING_KEY)
@authenticate('jwt.access')
export class NotificationsController {
  private readonly userId: typeof Users.prototype.userId;

  constructor(
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
    @repository(UsersRepository) protected usersRepository: UsersRepository,
    @repository(NotificationsRepository) public notifyRepo: NotificationsRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
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
        orders: ['createdAt ASC'],
        where: {
          additionalProp1: {},
        },
      },
    })
    filter?: Filter<Notifications>,
  ): Promise<Notifications[]> {
    const foundNotify = await this.usersRepository.notifications(this.userId).find({
      where: { ...filter?.where, deleted: false },
      limit: filter?.limit,
      order: filter?.order,
    });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.usersRepository
      .notifications(this.userId)
      .patch({ deleted: true }, { notifyId: { inq: foundNotify.map(n => n.getId()) } });

    return foundNotify;
  }
}
