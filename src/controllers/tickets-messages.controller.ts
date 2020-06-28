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

import {Tickets, Messages} from '../models';
import {
  TicketsRepository,
  UsersRepository,
  MessagesRepository,
} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {ValidateTicketIdInterceptor} from '../interceptors/validate-ticket-id.interceptor';

@intercept(ValidateTicketIdInterceptor.BINDING_KEY)
@api({basePath: '/api/', paths: {}})
@authenticate('jwt.access')
export class TicketsMessagesController {
  userId: number;

  constructor(
    @repository(TicketsRepository) public ticketsRepository: TicketsRepository,
    @repository(MessagesRepository)
    public messagesRepository: MessagesRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

  @post('/tickets/{ticketId}/messages', {
    summary: 'POST a Message',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Message model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Messages),
          },
        },
      },
    },
  })
  async createMessages(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Messages, {
            title: 'NewMessage',
            exclude: [
              'ticketId',
              'messageId',
              'userId',
              'createdAt',
              'question',
              'answer',
            ],
            includeRelations: false,
          }),
          example: {
            message: 'How can I be a GOLD User?',
          },
        },
      },
    })
    newMessage: Omit<Messages, 'messageId'>,
    @param.path.number('ticketId', {required: true})
    ticketId: typeof Tickets.prototype.ticketId,
  ): Promise<Messages> {
    const nowTime = new Date().toISOString();

    // Update Ticket
    await this.ticketsRepository.updateById(ticketId, {updatedAt: nowTime});

    const createdMessage = await this.ticketsRepository
      .messages(ticketId)
      .create({
        message: newMessage.message,
        createdAt: nowTime,
        userId: this.userId,
        question: true,
        answer: false,
      });

    return createdMessage;
  }

  @get('/ticket/{ticketId}/messages', {
    summary: 'GET all Messages belongs to Ticket by ticketId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Messages model instances',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Messages)},
          },
        },
      },
    },
  })
  async findMessages(
    @param.path.number('ticketId', {required: true})
    ticketId: typeof Tickets.prototype.ticketId,
  ): Promise<Messages[]> {
    return this.ticketsRepository.messages(ticketId).find({
      order: ['createdAt DESC'],
      where: {userId: this.userId},
    });
  }
}
