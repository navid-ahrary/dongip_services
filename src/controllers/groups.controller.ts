import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/context';
import { LoggingBindings, WinstonLogger } from '@loopback/logging';
import { repository } from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { Groups, Users } from '../models';
import { GroupsRepository, UsersRepository } from '../repositories';
import { CurrentUserProfile } from '../services';

@authenticate('jwt.access')
export class GroupsController {
  private readonly userId: typeof Users.prototype.userId;

  constructor(
    @inject(SecurityBindings.USER) private currentUserProfile: CurrentUserProfile,
    @inject(LoggingBindings.WINSTON_LOGGER) private logger: WinstonLogger,
    @repository(GroupsRepository) private groupsRepository: GroupsRepository,
    @repository(UsersRepository) private userRepository: UsersRepository,
  ) {
    this.userId = +this.currentUserProfile[securityId];
  }

  @post('/groups')
  @response(200, {
    description: 'Groups model instance',
    content: { 'application/json': { schema: getModelSchemaRef(Groups) } },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Groups, {
            title: 'NewGroups',
            exclude: ['groupId', 'createdAt', 'deleted', 'userId'],
          }),
        },
      },
    })
    group: Omit<Groups, 'groupId'>,
  ): Promise<Groups> {
    try {
      const createdGrp = await this.userRepository.groups(this.userId).create(group);

      // Join current user to the group
      await this.groupsRepository.groupParticipants(createdGrp.groupId).create({
        userId: this.userId,
        name: this.currentUserProfile.name,
      });

      return createdGrp;
    } catch (err) {
      this.logger.error(err);
      throw new HttpErrors.NotImplemented(err.message);
    }
  }

  @get('/groups')
  @response(200, {
    description: 'Array of Groups model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Groups, { includeRelations: false }),
        },
      },
    },
  })
  async find(): Promise<Groups[]> {
    try {
      const sqlStatement = `
        SELECT g.id AS groupId
        , g.title
        , g.\`desc\`
        , g.user_id AS userId
        , g.created_at AS createdAt
        FROM groups g
        LEFT JOIN group_participants gp ON g.id = gp.group_id
        WHERE gp.user_id = ? AND g.deleted = 0 AND gp.deleted = 0`;

      const result = <Groups[]>await this.groupsRepository.execute(sqlStatement, [this.userId]);

      const gps: Groups[] = [];
      result.forEach(r => gps.push(new Groups(r)));

      return gps;
    } catch (err) {
      this.logger.error(err);
      throw new HttpErrors.NotImplemented(err.message);
    }
  }

  @get('/groups/{groupId}')
  @response(200, {
    description: 'Groups model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Groups, { includeRelations: false }),
      },
    },
  })
  async findById(@param.path.number('groupId') groupId: number): Promise<Groups | null> {
    return this.groupsRepository.findOne({
      where: { groupId, userId: this.userId, deleted: false },
      include: [{ relation: 'groupParticipants', scope: { where: { deleted: false } } }],
    });
  }

  @patch('/groups/{groupId}')
  @response(204, {
    description: 'Groups PATCH success',
  })
  async updateById(
    @param.path.number('groupId') groupId: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Groups, {
            partial: true,
            exclude: ['createdAt', 'deleted', 'groupId', 'userId'],
          }),
        },
      },
    })
    groups: Groups,
  ): Promise<void> {
    await this.groupsRepository.updateById(groupId, groups);
  }

  @del('/groups/{groupId}')
  @response(204, {
    description: 'Groups DELETE success',
  })
  async deleteById(@param.path.number('groupId') groupId: number): Promise<void> {
    await this.groupsRepository.updateById(groupId, { deleted: true });
  }
}
