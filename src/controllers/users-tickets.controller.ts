import {repository} from '@loopback/repository';
import {
  post,
  get,
  getModelSchemaRef,
  requestBody,
  api,
  param,
} from '@loopback/rest';
import {inject, intercept} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';

import {Tickets} from '../models';
import {TicketsRepository, UsersRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {ValidateTicketIdInterceptor} from '../interceptors/validate-ticket-id.interceptor';

@api({basePath: '/api/users/', paths: {}})
@authenticate('jwt.access')
export class UsersTicketsController {
  userId: number;

  constructor(
    @repository(TicketsRepository) public ticketsRepository: TicketsRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

  @post('/tickets', {
    summary: 'Create a Ticket',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Tickets model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Tickets, {
              exclude: ['responseMessage', 'respondAt'],
            }),
          },
        },
      },
    },
  })
  async usersCreateTickets(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Tickets, {
            title: 'NewTickets',
            exclude: [
              'ticketId',
              'userId',
              'responseMessage',
              'askedAt',
              'respondAt',
            ],
            includeRelations: false,
          }),
          example: {
            ticketMessage: 'How can I be a GOLD User?',
          },
        },
      },
    })
    newTicket: Omit<Tickets, 'ticketId'>,
  ): Promise<Tickets> {
    newTicket.userId = this.userId;
    return this.ticketsRepository.create(newTicket);
  }

  @get('/tickets', {
    summary: 'Get all Tickets belogs to current User',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Tickets model instances',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Tickets)},
          },
        },
      },
    },
  })
  async usersFindTickets(): Promise<Tickets[]> {
    return this.usersRepository
      .tickets(this.userId)
      .find({order: ['askedAt DESC']});
  }

  @get('/tickets/{ticketId}', {
    summary: 'Get a Ticket by ticketId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'A Tcikets model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Tickets, {includeRelations: false}),
          },
        },
      },
    },
  })
  @intercept(ValidateTicketIdInterceptor.BINDING_KEY)
  async usersFindTicketById(
    @param.path.number('ticketId') ticketId: typeof Tickets.prototype.ticketId,
  ): Promise<Tickets> {
    return this.ticketsRepository.findById(ticketId);
  }
}
