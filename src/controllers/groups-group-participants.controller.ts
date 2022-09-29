import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/context';
import { service } from '@loopback/core';
import { LoggingBindings, WinstonLogger } from '@loopback/logging';
import { repository } from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  post,
  requestBody,
  RequestContext,
} from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import _ from 'lodash';
import util from 'util';
import { LocMsgsBindings } from '../keys';
import { GroupParticipants, GroupParticipantsCreateDto, Groups, Users } from '../models';
import { GroupsRepository, UsersRepository } from '../repositories';
import { CurrentUserProfile, FirebaseService } from '../services';
import { LocalizedMessages } from '../types';

@authenticate('jwt.access')
export class GroupsGroupParticipantsController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly lang: string;

  constructor(
    @inject.context() private ctx: RequestContext,
    @inject(LocMsgsBindings) private locMsg: LocalizedMessages,
    @inject(SecurityBindings.USER) private currentUserProfile: CurrentUserProfile,
    @inject(LoggingBindings.WINSTON_LOGGER) private logger: WinstonLogger,
    @service(FirebaseService) private firebaseService: FirebaseService,
    @repository(UsersRepository) private usersRepository: UsersRepository,
    @repository(GroupsRepository) private groupsRepository: GroupsRepository,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  @post('/groups/{groupId}/group-participants', {
    responses: {
      '200': {
        description: 'Groups model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(GroupParticipants, {
              exclude: ['createdAt', 'deleted', 'phone'],
            }),
          },
        },
      },
    },
  })
  async create(
    @param.path.number('groupId') groupId: typeof Groups.prototype.groupId,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(GroupParticipantsCreateDto, {
            title: 'NewGroupParticipantsInGroups',
          }),
        },
      },
    })
    groupParticipants: GroupParticipantsCreateDto,
  ) {
    try {
      const sql1 = `
        SELECT g.title FROM groups g
        WHERE id IN (
          SELECT g.id FROM groups g
          LEFT JOIN group_participants gp ON gp.group_id = g.id
          WHERE gp.phone=? AND gp.deleted=0 AND g.deleted=0
        )`;
      const groupRes = await this.groupsRepository.execute(sql1, [this.currentUserProfile.phone]);

      if (!groupRes.length) {
        throw new HttpErrors.NotFound('Group Not Found');
      }

      let sql2 = `
        SELECT gp.*, g.title FROM groups g
        LEFT JOIN group_participants gp ON gp.group_id = g.id
        WHERE gp.group_id = ? AND gp.deleted=0 `;
      const parms: (string | number)[] = [groupId];

      if (groupParticipants.phone) {
        sql2 += ' AND gp.phone=? ';
        parms.push(groupParticipants.phone);
      }

      const alreadyExists = await this.groupsRepository.execute(sql2, parms);

      if (!alreadyExists.length) {
        const createdParts = await this.groupsRepository
          .groupParticipants(groupId)
          .create({ ...groupParticipants, userId: this.userId });

        const sql3 = `
          SELECT s.language, u.id AS userId, u.firebase_token AS firebaseToken
          FROM users u
          LEFT JOIN settings s ON s.user_id = u.id
          WHERE u.phone=? AND firebase_token IS NOT NULL`;
        const userRes = await this.usersRepository.execute(sql3, [groupParticipants.phone]);

        if (userRes.length) {
          const foundTargetUser = userRes[0];
          const notifyTitle = this.locMsg['ADDED_TO_GROUP_TITLE'][foundTargetUser.language];
          const notifyBody = util.format(
            this.locMsg['ADDED_TO_GROUP_BODY'][foundTargetUser.language],
            groupRes[0].title,
          );
          const notifyType = 'addedToGroup';

          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.usersRepository
            .notifications(foundTargetUser.userId)
            .create({
              title: notifyTitle,
              body: notifyBody,
              type: notifyType,
              userId: foundTargetUser.userId,
              groupId: createdParts.groupId,
              createdAt: new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Tehran',
              }),
            })
            .then(async createdNotify => {
              const token = foundTargetUser.firebaseToken ?? ' ';
              await this.firebaseService.sendToDeviceMessage(token, {
                notification: {
                  title: notifyTitle,
                  body: notifyBody,
                },
                data: {
                  notifyId: createdNotify.getId().toString(),
                  type: notifyType,
                  title: notifyTitle,
                  body: notifyBody,
                  groupId: createdParts.groupId.toString(),
                },
              });
            });

          return createdParts;
        }
      } else {
        throw new HttpErrors.Conflict(this.locMsg['CONFLICT_GROUP_PARTICIPANTS'][this.lang]);
      }
    } catch (err) {
      this.logger.log('error', err);
      throw err;
    }
  }

  @get('/groups/{groupId}/group-participants', {
    responses: {
      '200': {
        description: 'Array of Groups has many GroupParticipants',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(GroupParticipants, { exclude: ['deleted', 'userId'] }),
            },
          },
        },
      },
    },
  })
  async find(@param.path.number('groupId') groupId: number): Promise<GroupParticipants[]> {
    try {
      const query = `
        SELECT
          gp.id AS groupParticipantId
          , gp.name
          , gp.group_id AS groupId
          , gp.phone
          , gp.created_at AS createdAt
        FROM group_participants gp
        WHERE gp.group_id IN (
          SELECT gp.group_id
          FROM group_participants gp
          LEFT JOIN groups g ON gp.group_id=g.id
          WHERE gp.phone=? AND gp.group_id=? AND g.deleted=0 AND gp.deleted=0
        )`;

      const gps = <GroupParticipants[]>(
        await this.groupsRepository.execute(query, [this.currentUserProfile.phone, groupId])
      );
      return gps;
    } catch (err) {
      this.logger.log('error', err);
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }

  @del('/groups/{groupId}/group-participants', {
    responses: {
      '204': {
        description: 'DELETE success, no content.',
      },
    },
  })
  async delete(
    @param.path.number('groupId') groupId: number,
    @param.query.string('phone') phone: string,
  ): Promise<void> {
    try {
      const query = `
        UPDATE group_participants
        SET deleted=1
        WHERE group_id IN (
          SELECT gp.group_id
          FROM group_participants gp
          LEFT JOIN groups g ON gp.group_id=g.id
          WHERE gp.group_id=? AND gp.phone=? AND g.deleted=0 AND gp.deleted=0 )
        AND phone=?`;

      const res = await this.groupsRepository.execute(query, [
        groupId,
        this.currentUserProfile.phone, // the current user must be participated in group also
        phone,
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
        throw new HttpErrors.NotFound('Not found');
      }

      const sql1 = `
        SELECT g.title, g.id AS groupId FROM groups g
        WHERE id IN (
          SELECT g.id FROM groups g
          LEFT JOIN group_participants gp ON gp.group_id = g.id
          WHERE gp.phone=? AND gp.deleted=0 AND g.deleted=0
        )`;

      const groupRes = await this.groupsRepository.execute(sql1, [this.currentUserProfile.phone]);

      const sql3 = `
        SELECT s.language, u.id AS userId, u.firebase_token AS firebaseToken
        FROM users u
        LEFT JOIN settings s ON s.user_id = u.id
        WHERE u.phone=? AND firebase_token IS NOT NULL`;

      const userRes = await this.usersRepository.execute(sql3, [phone]);

      if (userRes.length) {
        const foundTargetUser = userRes[0];

        const notifyTitle = this.locMsg['REMOVED_FROM_GROUP_TITLE'][foundTargetUser.language];
        const notifyBody = util.format(
          this.locMsg['REMOVED_FROM_GROUP_BODY'][foundTargetUser.language],
          groupRes[0].title,
        );
        const notifyType = 'leftFromGroup';

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.usersRepository
          .notifications(foundTargetUser.userId)
          .create({
            title: notifyTitle,
            body: notifyBody,
            type: notifyType,
            userId: foundTargetUser.userId,
            groupId: groupRes[0].groupId,
            createdAt: new Date().toLocaleString('en-US', {
              timeZone: 'Asia/Tehran',
            }),
          })
          .then(async createdNotify => {
            const token = foundTargetUser.firebaseToken ?? ' ';
            await this.firebaseService.sendToDeviceMessage(token, {
              notification: {
                title: notifyTitle,
                body: notifyBody,
              },
              data: {
                notifyId: createdNotify.getId().toString(),
                type: notifyType,
                title: notifyTitle,
                body: notifyBody,
                groupId: groupRes[0].groupId.toString(),
              },
            });
          });
      }
    } catch (err) {
      this.logger.log('error', err);
      throw err;
    }
  }
}
