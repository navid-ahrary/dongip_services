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

import _ from 'lodash';
import moment from 'moment';

import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {
  UsersRels,
  Users,
  UsersRelsRelations,
  Settings,
  UsersRelations,
  Notifications,
} from '../models';
import {
  UsersRepository,
  VirtualUsersRepository,
  BlacklistRepository,
  UsersRelsRepository,
  GroupsRepository,
  DongsRepository,
} from '../repositories';
import {FirebaseService, PhoneNumberService} from '../services';
import {
  ValidatePhoneNumInterceptor,
  FirebasetokenInterceptor,
  ValidateUsersRelsInterceptor,
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
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(GroupsRepository) public groupsRepository: GroupsRepository,
    @repository(DongsRepository) public dongsRepository: DongsRepository,
    @repository(VirtualUsersRepository)
    public virtualUsersRepository: VirtualUsersRepository,
    @repository(BlacklistRepository)
    public blacklistRepository: BlacklistRepository,
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
    @service(FirebaseService) public firebaseService: FirebaseService,
    @service(PhoneNumberService) public phoneNumberService: PhoneNumberService,
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
      throw new HttpErrors.UnprocessableEntity(':) تو بهترین دوست خودتی');
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
            errorMessage = 'این شماره تو لیست دوستهات وجود داره';
          } else errorMessage = 'خطای مدیریت نشده ' + err.message; // Otherwise

          throw new HttpErrors.Conflict(errorMessage);
        }

        throw new HttpErrors.NotAcceptable(err.message);
      });

    // Create a VirtualUser belongs to current user
    await this.usersRepository
      .virtualUsers(this.userId)
      .create({phone: userRelReqBody.phone, userRelId: createdUserRel.getId()});

    const foundTargetUser:
      | (Users & UsersRelations)
      | null = await this.usersRepository.findOne({
      where: {phone: userRelReqBody.phone},
      fields: {userId: true, firebaseToken: true},
    });

    if (foundTargetUser) {
      const foundTargetUserSettings: Settings = await this.usersRepository
        .settings(foundTargetUser.getId())
        .get({fields: {userRelNotify: true}});

      // Target user desired to receiving userRel suggestion notificication
      if (foundTargetUserSettings.userRelNotify) {
        let notifyTitle: string;
        let notifyBody: string;
        let notifyType: string;

        const foundBiUserRel:
          | (UsersRels & UsersRelsRelations)
          | null = await this.usersRelsRepository.findOne({
          where: {userId: foundTargetUser.getId(), phone: user.phone},
          fields: {name: true},
        });

        if (foundBiUserRel) {
          notifyType = 'biUserRel';
          notifyTitle = `سینک حساب با ${foundBiUserRel.name}`;
          notifyBody = `${foundBiUserRel.name} هم شما رو دوست دنگیپش میدونه. از این به بعد حساب های مشترک بین تون سینک میشن`;
        } else {
          notifyType = 'userRel';
          notifyTitle = 'دوستی جدید';
          notifyBody = `${user.name} شما رو دوست دنگیپش میدونه، اگه میخایی حساب های مشترک بین تون سینک باشه، این پیام رو لمس کن و به دوستهات اضافه ش کن`;
        }

        const createdNotify: Notifications = await this.usersRepository
          .notifications(foundTargetUser.getId())
          .create({
            title: notifyTitle,
            body: notifyBody,
            type: notifyType,
            name: user.name,
            phone: user.phone,
            avatar: user.avatar,
            createdAt: new Date().toLocaleString('en-US', {
              timeZone: 'Asia/Tehran',
            }),
          });
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.firebaseService.sendToDeviceMessage(
          foundTargetUser.firebaseToken,
          {
            notification: {
              title: notifyTitle,
              body: notifyBody,
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            },
            data: {
              notifyId: createdNotify.getId().toString(),
              type: notifyType,
              title: notifyTitle,
              body: notifyBody,
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

  @intercept(ValidateUsersRelsInterceptor.BINDING_KEY)
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
  async patchUsersRelsById(
    @param.path.number('userRelId', {required: true, example: 30})
    userRelId: typeof UsersRels.prototype.userRelId,
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
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<void> {
    let errorMessage: string;
    userRelReqBody.updatedAt = moment.utc().toISOString();

    try {
      // Patch UserRel
      await this.usersRepository.usersRels(this.userId).patch(userRelReqBody, {
        userRelId: userRelId,
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
        // Duplicate phone error handling
        if (err.sqlMessage.endsWith("'user_id&phone'")) {
          errorMessage = 'این شماره تو لیست دوستهات وجود داره';
        } else errorMessage = 'خطای مدیریت نشده ' + err.message;

        throw new HttpErrors.Conflict(errorMessage);
      }
      throw new HttpErrors.NotAcceptable(err.message);
    }
  }

  @intercept(ValidateUsersRelsInterceptor.BINDING_KEY)
  @del('/users-rels/{userRelId}', {
    summary: 'Delete a UsersRels by id',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {description: 'UsersRels DELETE success - No Content'},
    },
  })
  async deleteUsersRelsById(
    @param.path.number('userRelId', {required: true, example: 36})
    userRelId: typeof UsersRels.prototype.userRelId,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<void> {
    await this.usersRepository
      .usersRels(this.userId)
      .delete({and: [{userRelId: userRelId}, {type: {neq: 'self'}}]});

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
        description: 'Array of name, avatar, phone',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                name: {type: 'string'},
                avatar: {type: 'string'},
                phone: {type: 'string'},
              },
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
            minItems: 1,
            uniqueItems: true,
            items: {type: 'string'},
            nullable: false,
            additionalProperties: false,
            example: ['+989176502184', '+989387401240', '09197744814'],
          },
        },
      },
    })
    phonesList: string[],
  ): Promise<Partial<Users>[]> {
    let referenceRegionCode = '';
    const foundUser = await this.usersRepository.findById(this.userId, {
      fields: {phone: true, region: true},
    });

    if (foundUser.region) {
      referenceRegionCode = foundUser.region;
    } else {
      referenceRegionCode = this.phoneNumberService.getRegionCodeISO(
        foundUser.phone,
      );
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository.updateById(this.userId, {
        region: referenceRegionCode,
      });
    }
    // Normalize phone value to e.164 format
    const normalizedPhonesList = this.normalizePhonesList(
      phonesList,
      referenceRegionCode,
    );

    return this.usersRepository.find({
      order: ['name ASC'],
      fields: {name: true, phone: true, avatar: true},
      where: {phone: {inq: normalizedPhonesList}},
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

  /**
   *
   * @param phoneList string[]
   * @param refrenceRegionCode string
   * @return string[]
   */
  normalizePhonesList(
    phonesList: string[],
    refrenceRegionCode: string,
  ): string[] {
    phonesList.forEach((phone, index) => {
      phonesList[
        index
      ] = this.phoneNumberService.normalizePhoneNumberWithZeroPrefix(
        phone,
        refrenceRegionCode,
      );
    });
    return phonesList;
  }
}
