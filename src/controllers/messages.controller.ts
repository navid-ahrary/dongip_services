import {repository} from '@loopback/repository';
import {post, get, getModelSchemaRef, requestBody, api} from '@loopback/rest';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';

import {Messages} from '../models';
import {UsersRepository, MessagesRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

@api({basePath: '/', paths: {}})
@authenticate('jwt.access')
export class MessagesController {
  userId: number;

  constructor(
    @repository(MessagesRepository)
    public messagesRepository: MessagesRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
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
            exclude: [
              'messageId',
              'userId',
              'createdAt',
              'isQuestion',
              'isAnswer',
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
  ): Promise<Messages> {
    const messageEntity = {
      message: newMessage.message,
      createdAt: new Date().toISOString(),
      userId: this.userId,
      isQuestion: true,
      isAnswer: false,
    };

    return this.messagesRepository.create(messageEntity);
  }

  @get('/messages', {
    summary: 'GET all Messages',
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
  async findMessages(): Promise<Messages[]> {
    return this.messagesRepository.find({
      order: ['createdAt ASC'],
      where: {userId: this.userId},
    });
  }
}
