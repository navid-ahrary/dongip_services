import {get, getModelSchemaRef, api, param} from '@loopback/rest';
import {authorize} from '@loopback/authorization';
import {authenticate} from '@loopback/authentication';
import {repository, Filter} from '@loopback/repository';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';

import {Tickets, Messages} from '../models';
import {basicAuthorization} from '../services';
import {TicketsRepository, MessagesRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

@api({basePath: '/api/support/', paths: {}})
@authorize({allowedRoles: ['GOD'], voters: [basicAuthorization]})
@authenticate('jwt.access')
export class SupportController {
  userId: number;

  constructor(
    @repository(TicketsRepository) public ticketsRepository: TicketsRepository,
    @repository(MessagesRepository)
    public messagesRepository: MessagesRepository,
    @inject(SecurityBindings.USER) protected curretnUserProfile: UserProfile,
  ) {
    this.userId = Number(this.curretnUserProfile[securityId]);
  }

  @get('/messages', {
    summary: ' GET Messages asked recently',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Message model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Tickets),
          },
        },
      },
    },
  })
  async findMessages(
    @param.filter(Messages) filter: Filter<Messages>,
  ): Promise<Messages[]> {
    return this.messagesRepository.find({
      offset: 0,
      limit: 10,
      order: ['createdAt DESC'],
    });
  }
}
