/* eslint-disable prefer-const */
import {repository, Count} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  requestBody,
  HttpErrors,
  api,
  del,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject, service, intercept} from '@loopback/core';

import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {UsersRels, Users} from '../models';
import {
  UsersRepository,
  VirtualUsersRepository,
  BlacklistRepository,
  UsersRelsRepository,
  GroupsRepository,
  DongsRepository,
} from '../repositories';
import {FirebaseService} from '../services';
import _ from 'lodash';
import {
  ValidatePhoneNumInterceptor,
  FirebasetokenInterceptor,
} from '../interceptors';

@api({basePath: '/', paths: {}})
@intercept(
  ValidatePhoneNumInterceptor.BINDING_KEY,
  FirebasetokenInterceptor.BINDING_KEY,
)
@authenticate('jwt.access')
export class UsersRelsController {
  userId: number;

  constructor(
    @repository(UsersRepository) protected usersRepository: UsersRepository,
    @repository(GroupsRepository) protected groupsRepository: GroupsRepository,
    @repository(DongsRepository) protected dongsRepository: DongsRepository,
    @repository(VirtualUsersRepository)
    protected virtualUsersRepository: VirtualUsersRepository,
    @repository(BlacklistRepository)
    protected blacklistRepository: BlacklistRepository,
    @repository(UsersRelsRepository)
    protected usersRelsRepository: UsersRelsRepository,
    @service(FirebaseService) protected firebaseService: FirebaseService,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

  @get('/users-rels', {
    summary: 'Get array of all UsersRels',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of UsersRels',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(UsersRels)},
          },
        },
      },
    },
  })
  async find(
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<UsersRels[]> {
    return this.usersRepository.usersRels(this.userId).find();
  }

  @post('/users-rels', {
    summary: 'Create a new UsersRels',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'New UsersRels',
        content: {
          'application/json': {
            schema: getModelSchemaRef(UsersRels),
          },
        },
      },
    },
  })
  async createUsersRels(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(UsersRels, {
            exclude: ['userRelId', 'userId', 'type', 'createdAt', 'updatedAt'],
          }),
          example: {
            phone: '+989122222222',
            avatar: '/assets/avatar/avatar_12.png',
            name: 'Samood',
          },
        },
      },
    })
    userRelReqBody: Omit<UsersRels, 'id'>,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<UsersRels> {
    const userRelObject: UsersRels = new UsersRels({
      name: userRelReqBody.name,
      avatar: userRelReqBody.avatar,
      type: 'virtual',
      phone: userRelReqBody.phone,
    });

    // Check phone number is not user's
    const user = await this.usersRepository.findById(this.userId, {
      fields: {phone: true, avatar: true, name: true},
    });
    if (user.phone === userRelReqBody.phone) {
      throw new HttpErrors.UnprocessableEntity('تو بهترین دوست خودتی!');
    }
    // Create a UserRel belongs to current user
    const createdUserRel: UsersRels = await this.usersRepository
      .usersRels(this.userId)
      .create(userRelObject)
      .catch((err) => {
        // Duplicate error handling
        if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
          let errorMessage: string;

          // Duplicate phone error handling
          if (err.sqlMessage.endsWith("'user_id&phone'")) {
            errorMessage = 'این شماره موبایل توی لیست دوستات وجود داره!';
          } else errorMessage = err.message; // Otherwise

          throw new HttpErrors.Conflict(errorMessage);
        }

        throw new HttpErrors.NotAcceptable(err.message);
      });

    // Create a VirtualUser belongs to current user
    await this.usersRepository
      .virtualUsers(this.userId)
      .create({phone: userRelReqBody.phone, userRelId: createdUserRel.getId()});

    const foundTargetUser = await this.usersRepository.findOne({
      where: {phone: userRelReqBody.phone},
      fields: {userId: true, firebaseToken: true},
    });

    if (foundTargetUser) {
      const foundTargetUserSettings = await this.usersRepository
        .settings(foundTargetUser.getId())
        .get({fields: {userRelNotify: true}});

      // Target user desired to receiving userRel suggestion notificication
      if (foundTargetUserSettings.userRelNotify) {
        const createdNotify = await this.usersRepository
          .notifications(foundTargetUser.getId())
          .create({
            title: 'پیشنهاد دوستی',
            body: `${user.name} تو رو به دوستاش اضافه کرد`,
            type: 'userRel',
            name: user.name,
            phone: user.phone,
            avatar: user.avatar,
          });
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.firebaseService.sendToDeviceMessage(
          foundTargetUser.firebaseToken,
          {
            notification: {
              title: 'پیشنهاد دوستی',
              body: `${user.name} تو رو به دوستاش اضافه کرد`,
              clickAction: 'FULTTER_NOTIFICATION_CLICK',
            },
            data: {
              notifyId: createdNotify.getId().toString(),
              title: 'پیشنهاد دوستی',
              body: `${user.name} تو رو به دوستاش اضافه کرد`,
              name: user.name,
              phone: user.phone,
              avatar: user.avatar,
            },
          },
        );
      }
    }

    return createdUserRel;
  }

  @patch('/users-rels/{userRelId}', {
    summary: 'Update a UsersRels by id',
    description: 'Send just desired properties to update',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'UserRels PATCH success - No Content',
      },
    },
  })
  async patchUsersRels(
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(UsersRels, {
            partial: true,
            exclude: ['userId', 'type', 'createdAt', 'updatedAt'],
          }),
          examples: {
            someProps: {
              value: {
                name: 'Samood',
                avatar: 'assets/avatar/avatar_1.png',
                phone: '+989108522580',
              },
            },
            singleProp: {
              value: {
                name: 'Samood',
              },
            },
          },
        },
      },
    })
    userRelReqBody: Partial<UsersRels>,
    @param.path.number('userRelId', {required: true, example: 30})
    userRelId: typeof UsersRels.prototype.userRelId,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<void> {
    let errorMessage: string;
    userRelReqBody.updatedAt = new Date().toISOString();

    try {
      // Patch UserRel
      await this.usersRepository
        .usersRels(this.userId)
        .patch(userRelReqBody, {
          and: [{userRelId: userRelId}, {type: {neq: 'self'}}],
        })
        .then((countPatched) => {
          if (!countPatched.count) {
            errorMessage = 'این رابطه دوستی رو پیدا نکردم!';
            throw new HttpErrors.UnprocessableEntity(errorMessage);
          }
        });

      // Patch related VirtualUser entity
      const vu = _.pick(userRelReqBody, ['phone']);
      if (vu.phone) {
        await this.usersRelsRepository
          .hasOneVirtualUser(userRelId)
          .patch(vu, {userId: this.userId});
      }
    } catch (err) {
      // Duplicate error handling
      if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
        // Duplicate name error hanfling
        if (err.sqlMessage.endsWith("'users_rels.user_id&name'")) {
          errorMessage = 'این اسم توی لیست دوستات وجود داره!';
          // Duplicate phone error handling
        } else if (
          err.sqlMessage.endsWith("'users_rels.user_id&phone'") ||
          err.sqlMessage.endsWith("'VirtualUsers.phone'")
        ) {
          errorMessage = 'این شماره توی لیست دوستات وجود داره!';
        } else {
          errorMessage = 'خطای مدیریت نشده ' + err.message;
        }
        throw new HttpErrors.Conflict(errorMessage);
      }
      throw new HttpErrors.NotAcceptable(err.message);
    }
  }

  @del('/users-rels/{userRelId}', {
    summary: 'Delete a UsersRels by id',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {description: 'UsersRels DELETE success - No Content'},
    },
  })
  async deleteById(
    @param.path.number('userRelId', {required: true, example: 36})
    userRelId: typeof UsersRels.prototype.userRelId,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<void> {
    await this.usersRepository
      .usersRels(this.userId)
      .delete({and: [{userRelId: userRelId}, {type: {neq: 'self'}}]})
      .then((countDeleted) => {
        if (!countDeleted.count) {
          throw new HttpErrors.UnprocessableEntity(
            'این رابطه دوستی رو پیدا نکردم',
          );
        }
      });

    await this.usersRepository
      .virtualUsers(this.userId)
      .delete({userRelId: userRelId})
      .catch(async (err) => {
        throw new HttpErrors.NotImplemented(err.message);
      });

    // Remove userRelId from Groups
    const foundGroupsUserRelIds = await this.groupsRepository.find({
      where: {userId: this.userId},
      fields: {groupId: true, userRelIds: true},
    });
    for (const group of foundGroupsUserRelIds) {
      if (group.userRelIds.includes(userRelId)) {
        const updatedUserRelIds = _.remove(group.userRelIds, function (id) {
          return id !== userRelId;
        });
        await this.groupsRepository.updateById(group.groupId, {
          userRelIds: updatedUserRelIds,
        });
      }
    }
  }

  @post('/users-rels/find-friends', {
    summary: 'Find friends with phone numbers',
    description:
      'Post array of phone numbers to know whom registered at dongip',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "Array of Users's name, avatar, phone",
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Users, {
                includeRelations: false,
                exclude: [
                  'userId',
                  'roles',
                  'billList',
                  'firebaseToken',
                  'refreshToken',
                  'registeredAt',
                  'userAgent',
                ],
              }),
            },
          },
        },
      },
    },
  })
  async findFriends(
    @requestBody({
      description: 'Array of phone numbers',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {type: 'string'},
            readOnly: true,
            nullable: false,
            additionalProperties: false,
            example: ['+989176502184', '+989387401240'],
          },
        },
      },
    })
    phonesList: string[],
  ): Promise<Partial<Users>[]> {
    return this.usersRepository.find({
      order: ['name ASC'],
      fields: {name: true, phone: true, avatar: true},
      where: {phone: {inq: phonesList}},
    });
  }

  @del('/users-rels', {
    summary: "Delete all user's UsersRels ",
    security: OPERATION_SECURITY_SPEC,
    responses: {'200': {description: 'Count deleted UsersRels'}},
  })
  async deleteAllUsersRels() {
    let countDeletedUsersRels: Count;

    try {
      await this.virtualUsersRepository.deleteAll({userId: this.userId});

      countDeletedUsersRels = await this.usersRelsRepository.deleteAll({
        type: {neq: 'self'},
        userId: this.userId,
      });

      // Delete all Groups
      await this.groupsRepository.deleteAll({userId: this.userId});
      // Update all Dongs
      await this.dongsRepository.updateAll(
        {groupId: undefined},
        {userId: this.userId},
      );

      return countDeletedUsersRels;
    } catch (err) {
      throw new HttpErrors.NotImplemented(err.message);
    }
  }
}
