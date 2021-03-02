import { inject, intercept, service } from '@loopback/core';
import { repository } from '@loopback/repository';
import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { post, getModelSchemaRef, requestBody, get } from '@loopback/rest';
import { Messages } from '../models';
import { FirebaseService } from '../services';
import { UsersRepository, MessagesRepository } from '../repositories';
import { FirebaseTokenInterceptor } from '../interceptors';

@intercept(FirebaseTokenInterceptor.BINDING_KEY)
@authenticate('jwt.access')
export class MessagesController {
  private readonly userId: number;
  readonly name: string;

  constructor(
    @service(FirebaseService) public firebaseService: FirebaseService,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(MessagesRepository) public messagesRepository: MessagesRepository,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.name = this.currentUserProfile.name!;
  }

  @post('/messages', {
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
            exclude: ['messageId', 'userId', 'createdAt', 'isQuestion', 'isAnswer'],
            includeRelations: false,
          }),
          example: {
            message: 'How can I be a GOLD User?',
          },
        },
      },
    })
    newMessage: Omit<Messages, 'messageId'>,
  ): Promise<Messages> {
    const messageContent = newMessage.message;

    const messageEntity = new Messages({
      message: messageContent,
      isQuestion: true,
      isAnswer: false,
    });

    const createdMsg = await this.usersRepository.messages(this.userId).create(messageEntity);

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.usersRepository
      .find({
        fields: { firebaseToken: true },
        where: {
          phone: { inq: ['+989176502184', '+989197744814'] },
          firebaseToken: { nin: [undefined, null!, 'null'] },
        },
      })
      .then((users) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.firebaseService.sendMultiCastMessage({
          tokens: users.map((u) => u.firebaseToken!),
          notification: {
            title: `TicketId ${createdMsg.getId()} From '${this.name}', id ${this.userId}`,
            body: messageContent,
          },
        });
      });

    return createdMsg;
  }

  @get('/messages', {
    summary: 'GET all Messages',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Messages model instances',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(Messages) },
          },
        },
      },
    },
  })
  async findMessages(): Promise<Messages[]> {
    return this.messagesRepository.find({
      order: ['createdAt ASC'],
      where: { userId: this.userId },
    });
  }
}
