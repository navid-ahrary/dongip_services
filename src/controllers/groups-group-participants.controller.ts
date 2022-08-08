import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/context';
import { LoggingBindings, WinstonLogger } from '@loopback/logging';
import { Count, CountSchema, repository, Where } from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { GroupParticipants, Groups, Users } from '../models';
import { GroupsRepository } from '../repositories';
import { CurrentUserProfile } from '../services';

@authenticate('jwt.access')
export class GroupsGroupParticipantsController {
  private readonly userId: typeof Users.prototype.userId;

  constructor(
    @inject(SecurityBindings.USER) private currentUserProfile: CurrentUserProfile,
    @inject(LoggingBindings.WINSTON_LOGGER) private logger: WinstonLogger,
    @repository(GroupsRepository) protected groupsRepository: GroupsRepository,
  ) {
    this.userId = +this.currentUserProfile[securityId];
  }

  @get('/groups/{groupId}/group-participants', {
    responses: {
      '200': {
        description: 'Array of Groups has many GroupParticipants',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(GroupParticipants) },
          },
        },
      },
    },
  })
  async find(@param.path.number('groupId') groupId: number): Promise<GroupParticipants[]> {
    return this.groupsRepository.groupParticipants(groupId).find();
  }

  @post('/groups/{groupId}/group-participants', {
    responses: {
      '200': {
        description: 'Groups model instance',
        content: { 'application/json': { schema: getModelSchemaRef(GroupParticipants) } },
      },
    },
  })
  async create(
    @param.path.number('groupId') groupId: typeof Groups.prototype.groupId,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(GroupParticipants, {
            title: 'NewGroupParticipantsInGroups',
            exclude: ['groupParticipantId'],
            optional: ['groupId'],
          }),
        },
      },
    })
    groupParticipants: Omit<GroupParticipants, 'groupParticipantId'>,
  ): Promise<GroupParticipants> {
    return this.groupsRepository.groupParticipants(groupId).create(groupParticipants);
  }

  @patch('/groups/{groupId}/group-participants', {
    responses: {
      '200': {
        description: 'Groups.GroupParticipants PATCH success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  async patch(
    @param.path.number('groupId') groupId: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(GroupParticipants, { partial: true }),
        },
      },
    })
    groupParticipants: Partial<GroupParticipants>,
    @param.query.object('where', getWhereSchemaFor(GroupParticipants))
    where?: Where<GroupParticipants>,
  ): Promise<Count> {
    return this.groupsRepository.groupParticipants(groupId).patch(groupParticipants, where);
  }

  @del('/groups/{groupId}/group-participants', {
    responses: {
      '200': {
        description: 'Groups.GroupParticipants DELETE success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  async delete(
    @param.path.number('groupId') groupId: number,
    @param.query.object('where', getWhereSchemaFor(GroupParticipants))
    where?: Where<GroupParticipants>,
  ): Promise<Count> {
    return this.groupsRepository.groupParticipants(groupId).delete(where);
  }
}
