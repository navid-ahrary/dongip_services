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
  RequestContext,
  response,
} from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import _ from 'lodash';
import { LocMsgsBindings } from '../keys';
import { Groups, Users } from '../models';
import { GroupsRepository, UsersRepository } from '../repositories';
import { CurrentUserProfile } from '../services';
import { LocalizedMessages } from '../types';

@authenticate('jwt.access')
export class GroupsController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly lang: string;

  constructor(
    @inject.context() private ctx: RequestContext,
    @inject(LocMsgsBindings) private locMsg: LocalizedMessages,
    @inject(SecurityBindings.USER) private currentUserProfile: CurrentUserProfile,
    @inject(LoggingBindings.WINSTON_LOGGER) private logger: WinstonLogger,
    @repository(GroupsRepository) private groupsRepository: GroupsRepository,
    @repository(UsersRepository) private userRepository: UsersRepository,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
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
        phone: this.currentUserProfile.phone,
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
          , g.created_at AS createdAt
        FROM groups g
        LEFT JOIN group_participants gp ON g.id = gp.group_id
        WHERE gp.phone = ? AND g.deleted = 0 AND gp.deleted = 0`;

      const result = <Groups[]>(
        await this.groupsRepository.execute(sqlStatement, [this.currentUserProfile.phone])
      );

      const gps: Groups[] = [];
      result.forEach(r => gps.push(new Groups(r)));

      return gps;
    } catch (err) {
      this.logger.error(err);
      throw new HttpErrors.NotImplemented(err.message);
    }
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
    group: Groups,
  ): Promise<void> {
    try {
      const query1 = `
        SELECT g.* FROM group_participants gp
        LEFT JOIN groups g ON gp.group_id=g.id
        WHERE gp.group_id=? AND gp.phone=? AND g.deleted=0 AND gp.deleted=0 `;

      const res = await this.groupsRepository.execute(query1, [
        groupId,
        this.currentUserProfile.phone, // the current user must be participated in group also
      ]);

      if (!res.length) {
        throw new HttpErrors.NotFound('Not found');
      }

      await this.groupsRepository.updateById(groupId, group);
    } catch (err) {
      this.logger.log('error', err);
      throw err;
    }
  }

  @del('/groups/{groupId}')
  @response(204, {
    description: 'Groups DELETE success',
  })
  @response(404, {
    description: 'Failed. Group not found',
  })
  async deleteById(@param.path.number('groupId') groupId: number): Promise<void> {
    try {
      const deleteGroupSql = `
        UPDATE groups
        SET deleted=1
        WHERE id IN (
          SELECT gp.group_id
          FROM group_participants gp
          LEFT JOIN groups g ON gp.group_id=g.id
          WHERE gp.group_id=? AND g.user_id=? AND g.deleted=0 AND gp.deleted=0
        ) `;

      const res = await this.groupsRepository.execute(deleteGroupSql, [
        groupId,
        this.userId, // the current user must be admin of the group
      ]);

      // res =>
      // OkPacket {
      //   fieldCount: 0,
      //   affectedRows: 1,
      //   insertId: 0,
      //   serverStatus: 2,
      //   warningCount: 0,
      //   message: '(Rows matched: 1  Changed: 1  Warnings: 0',
      //   protocol41: true,
      //   changedRows: 1
      // }

      if (res.changedRows === 0) {
        throw new HttpErrors.UnprocessableEntity(this.locMsg['GROUP_NOT_BELONG_USER'][this.lang]);
      }

      const deleteGroupPartsSql = `
        UPDATE group_participants
        SET deleted=1
        WHERE group_id IN (
          SELECT gp.group_id
          FROM group_participants gp
          LEFT JOIN groups g ON gp.group_id=g.id
          WHERE gp.group_id=? AND g.deleted=1
        )`;

      await this.groupsRepository.execute(deleteGroupPartsSql, [groupId]);
    } catch (err) {
      this.logger.log('error', err);
      throw err;
    }
  }
}
