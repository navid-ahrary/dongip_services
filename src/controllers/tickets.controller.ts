import {repository} from '@loopback/repository';
import {
  post,
  get,
  getModelSchemaRef,
  requestBody,
  api,
  param,
} from '@loopback/rest';
import {inject, service} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';

import {Tickets} from '../models';
import {TicketsRepository, UsersRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {basicAuthorization, FirebaseService} from '../services';

@api({basePath: '/api/', paths: {}})
@authenticate('jwt.access')
@authorize({allowedRoles: ['GOD'], voters: [basicAuthorization]})
export class TicketsController {
  userId: number;

  constructor(
    @repository(TicketsRepository) public ticketsRepository: TicketsRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
    @service(FirebaseService) protected firebaseService: FirebaseService,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

  @get('/tickets/', {
    summary: 'Get array of asked tickets recently',
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
  async getTickets(): Promise<Tickets[]> {
    return this.ticketsRepository.find({
      order: ['askedAt DESC', 'respondAt ASC'],
    });
  }

  @post('/tickets/{ticketId}/respond', {
    summary: 'Reponse to a Ticket by ticketId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Tickets model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Tickets, {includeRelations: false}),
          },
        },
      },
    },
  })
  async respondToTickets(
    @param.path.number('ticketId', {required: true})
    ticketId: typeof Tickets.prototype.ticketId,
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(Tickets, {
            title: 'NewTickets',
            exclude: ['ticketMessage', 'askedAt', 'respondAt', 'userId'],
            includeRelations: false,
          }),
          example: {
            responseMessage: 'Pay money',
          },
        },
      },
    })
    responseReqBody: Omit<Tickets, 'ticketId'>,
  ): Promise<void> {
    responseReqBody.respondAt = new Date().toISOString();
    // Update Ticket with reponse message
    await this.ticketsRepository.updateById(ticketId, responseReqBody);

    const foundTicket = await this.ticketsRepository.findById(ticketId, {
      fields: {userId: true},
    });

    const foundUser = await this.usersRepository.findById(foundTicket.userId, {
      fields: {firebaseToken: true},
    });

    if (foundUser.firebaseToken && responseReqBody.responseMessage) {
      // Send respond notify to User
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.firebaseService.sendToDeviceMessage(foundUser.firebaseToken, {
        notification: {
          title: 'پاسخ به تیکت',
          body: responseReqBody.responseMessage,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
        data: {
          ticketId: ticketId.toString(),
          respondMessage: responseReqBody.responseMessage,
        },
      });
    }
  }
}
