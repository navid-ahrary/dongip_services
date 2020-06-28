import {repository} from '@loopback/repository';
import {get, getModelSchemaRef, api} from '@loopback/rest';
import {inject, service} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';

import {Tickets} from '../models';
import {TicketsRepository, UsersRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {FirebaseService} from '../services';

@api({basePath: '/api/', paths: {}})
@authenticate('jwt.access')
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
    summary: 'GET tickets',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Tickets model instances',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Tickets),
          },
        },
      },
    },
  })
  async findTickets(): Promise<Tickets> {
    const nowTime = new Date().toISOString();

    const foundTicket = await this.ticketsRepository.findOne({
      where: {userId: this.userId},
      include: [{relation: 'messages'}],
    });

    if (!foundTicket) {
      return this.ticketsRepository.create({
        userId: this.userId,
        createdAt: nowTime,
        updatedAt: nowTime,
      });
    } else {
      return foundTicket;
    }
  }

  // @post('/tickets/{ticketId}/respond', {
  //   summary: 'Reponse to a Ticket by ticketId',
  //   security: OPERATION_SECURITY_SPEC,
  //   responses: {
  //     '200': {
  //       description: 'Tickets model instance',
  //       content: {
  //         'application/json': {
  //           schema: getModelSchemaRef(Tickets, {includeRelations: false}),
  //         },
  //       },
  //     },
  //   },
  // })
  // async respondToTickets(
  //   @param.path.number('ticketId', {required: true})
  //   ticketId: typeof Tickets.prototype.ticketId,
  //   @requestBody({
  //     required: true,
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Tickets, {
  //           title: 'RespondTickets',
  //           exclude: ['createdAt', 'updatedAt', 'userId', 'ticketId'],
  //         }),
  //         example: {responseMessage: 'Pay money'},
  //       },
  //     },
  //   })
  //   responseReqBody: Omit<Tickets, 'ticketId'>,
  // ): Promise<void> {
  //   responseReqBody.updatedAt = new Date().toISOString();

  //   console.log(responseReqBody);
  //   // Update Ticket with reponse message
  //   await this.ticketsRepository.updateById(ticketId, responseReqBody);

  //   const foundTicket = await this.ticketsRepository.findById(ticketId, {
  //     fields: {userId: true},
  //   });

  //   const foundUser = await this.usersRepository.findById(foundTicket.userId, {
  //     fields: {firebaseToken: true},
  //   });

  //   if (foundUser.firebaseToken && responseReqBody.messages) {
  //     // Send respond notify to User
  //     // eslint-disable-next-line @typescript-eslint/no-floating-promises
  //     this.firebaseService.sendToDeviceMessage(foundUser.firebaseToken, {
  //       notification: {
  //         title: 'پاسخ به تیکت',
  //         // body: responseReqBody.responseMessage,
  //         clickAction: 'FLUTTER_NOTIFICATION_CLICK',
  //       },
  //       data: {
  //         ticketId: ticketId.toString(),
  //         // responseMessage: responseReqBody.responseMessage,
  //       },
  //     });
  //   }
  // }
}
