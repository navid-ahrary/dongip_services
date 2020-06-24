import {repository} from '@loopback/repository';
import {
  post,
  get,
  getModelSchemaRef,
  requestBody,
  api,
  param,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {Tickets, TicketsRelations} from '../models';
import {TicketsRepository, UsersRepository} from '../repositories';
import {inject, intercept} from '@loopback/core';
import {authenticate} from '@loopback/authentication';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {ValidateTicketIdInterceptor} from '../interceptors/validate-ticket-id.interceptor';

@api({basePath: '/api/', paths: {}})
@authenticate('jwt.access')
export class TicketsController {
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
  async createTickets(
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
            question: 'How can I buy gold account?',
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
    summary: 'Get all Tickets',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Tickets model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Tickets, {includeRelations: false}),
            },
          },
        },
      },
    },
  })
  async findTickets(): Promise<Tickets[]> {
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
  async findTicketById(
    @param.path.number('ticketId') ticketId: typeof Tickets.prototype.ticketId,
  ): Promise<Tickets> {
    return this.ticketsRepository.findById(ticketId);
  }
}
