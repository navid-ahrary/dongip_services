/* eslint-disable prefer-const */
import {repository} from '@loopback/repository';
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
  RequestContext,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject, service, intercept} from '@loopback/core';

import _ from 'lodash';
import moment from 'moment';
import util from 'util';

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
import {FirebaseService, PhoneNumberService} from '../services';
import {
  ValidatePhoneEmailInterceptor,
  FirebasetokenInterceptor,
  ValidateUsersRelsInterceptor,
} from '../interceptors';
import {LocalizedMessages} from '../application';

@api({basePath: '/', paths: {}})
@intercept(
  ValidatePhoneEmailInterceptor.BINDING_KEY,
  FirebasetokenInterceptor.BINDING_KEY,
)
@authenticate('jwt.access')
export class UsersRelsController {
  private readonly userId: number;
  lang: string;

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
    @inject.context() public ctx: RequestContext,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.lang = this.ctx.request.headers['accept-language']
      ? this.ctx.request.headers['accept-language']
      : 'fa';
  }

  private normalizePhonesList(
    phonesList: string[],
    refrenceRegionCode: string,
  ): string[] {
    phonesList.forEach((phone, index) => {
      phonesList[index] = this.phoneNumberService.normalizeZeroPrefix(
        phone,
        refrenceRegionCode,
      );
    });
    return phonesList;
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
  async find(): Promise<UsersRels[]> {
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
            phone: '+989171234567',
            avatar: '/assets/avatar/avatar_12.png',
            name: 'Dongip',
          },
        },
      },
    })
    userRelReqBody: Omit<UsersRels, 'id'>,
  ): Promise<UsersRels> {
    const userRelObject = new UsersRels({
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
      throw new HttpErrors.UnprocessableEntity(
        this.locMsg['YOURE_YOUR_FRIEND'][this.lang],
      );
    }

    // Create a UserRel belongs to current user
    const createdUserRel = await this.usersRepository
      .usersRels(this.userId)
      .create(userRelObject)
      .catch((err) => {
        // Duplicate error handling
        if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
          let errorMessage: string;

          // Duplicate phone error handling
          if (err.sqlMessage.endsWith("'user_id&phone'")) {
            errorMessage = this.locMsg['USERS_RELS_CONFILICT_PHONE'][this.lang];
          } else errorMessage = ' unmanaged error ' + err.message; // Otherwise

          throw new HttpErrors.Conflict(errorMessage);
        }

        throw new HttpErrors.NotAcceptable(err.message);
      });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.usersRepository
      .virtualUsers(this.userId)
      .create({phone: userRelReqBody.phone, userRelId: createdUserRel.getId()});

    const foundTargetUser = await this.usersRepository.findOne({
      where: {phone: userRelReqBody.phone},
      fields: {userId: true, firebaseToken: true, setting: true},
      include: [{relation: 'setting'}],
    });

    if (foundTargetUser) {
      // Target user desired to receiving userRel suggestion notificication
      if (foundTargetUser.setting.userRelNotify) {
        let notifyTitle: string;
        let notifyBody: string;
        let notifyType: string;

        const foundBiUserRel = await this.usersRelsRepository.findOne({
          where: {userId: foundTargetUser.getId(), phone: user.phone},
          fields: {name: true},
        });

        if (!foundBiUserRel) {
          userRelObject.type = 'unidirectional';

          notifyType = 'userRel';
          notifyTitle = this.locMsg['NEW_USERS_RELS_NOTIFY_TITLE'][
            foundTargetUser.setting.language
          ];
          notifyBody = util.format(
            this.locMsg['NEW_USERS_RELS_NOTIFY_BODY'][
              foundTargetUser.setting.language
            ],
            user.name,
          );
        } else {
          userRelObject.type = 'bidirectional';

          notifyType = 'biUserRel';
          notifyTitle = util.format(
            this.locMsg['USERS_RELS_BACK_NOTIFY_TITLE'][
              foundTargetUser.setting.language
            ],
            foundBiUserRel.name,
          );
          notifyBody = util.format(
            this.locMsg['USERS_RELS_BACK_NOTIFY_BODY'][
              foundTargetUser.setting.language
            ],
            foundBiUserRel.name,
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.usersRelsRepository.updateById(createdUserRel.getId(), {
          type: userRelObject.type,
        });

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.usersRepository
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
          })
          .then(async (createdNotify) => {
            await this.firebaseService.sendToDeviceMessage(
              foundTargetUser.firebaseToken!,
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
                  phone: user.phone!,
                  avatar: user.avatar,
                },
              },
            );
          });
      }
    }

    return createdUserRel;
  }

  @intercept(ValidateUsersRelsInterceptor.BINDING_KEY)
  @patch('/users-rels/{userRelId}', {
    summary: 'Update a UsersRels by id',
    description: 'Send just desired properties to update.',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'UserRels PATCH success - No Content',
      },
    },
  })
  async updateUsersRelsById(
    @param.path.number('userRelId', {required: true, example: 30})
    userRelId: typeof UsersRels.prototype.userRelId,
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(UsersRels, {
            partial: true,
            exclude: ['userId', 'type', 'createdAt', 'updatedAt', 'email'],
          }),
          examples: {
            someProps: {
              value: {
                name: 'Dongip',
                avatar: 'assets/avatar/avatar_1.png',
                phone: '+9891712345678',
              },
            },
            singleProp: {
              value: {
                name: 'Dongip',
              },
            },
          },
        },
      },
    })
    patchUserRelReqBody: Partial<UsersRels>,
  ): Promise<void> {
    let errorMessage: string;

    patchUserRelReqBody.updatedAt = moment.utc().toISOString();

    try {
      // Patch UserRel
      await this.usersRepository
        .usersRels(this.userId)
        .patch(patchUserRelReqBody, {
          userRelId: userRelId,
        });

      // Patch related VirtualUser entity
      const vu = _.pick(patchUserRelReqBody, ['phone']);
      if (vu.phone) {
        await this.usersRelsRepository
          .hasOneVirtualUser(userRelId)
          .patch(vu, {userId: this.userId});
      }
    } catch (err) {
      if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
        if (err.sqlMessage.endsWith("'user_id&phone'")) {
          errorMessage = this.locMsg['USERS_RELS_CONFILICT_PHONE'][this.lang];
        } else errorMessage = 'Unmanaged error ' + err.message;

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
      'Post array of phone numbers to know whom registered in dongip',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of name, avatar, phone',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Users, {
                exclude: [
                  'username',
                  'userId',
                  'firebaseToken',
                  'platform',
                  'refreshToken',
                  'region',
                  'registeredAt',
                  'roles',
                  'userAgent',
                ],
                includeRelations: false,
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
            minItems: 1,
            items: {type: 'string'},
            nullable: false,
            additionalProperties: false,
            example: ['+989176502184', '+989387401240', '09197744814'],
          },
        },
      },
    })
    phonesList: string[],
  ): Promise<Users[]> {
    let referenceRegionCode = '';
    const foundUser = await this.usersRepository.findById(this.userId, {
      fields: {phone: true, region: true},
    });

    if (foundUser.region) {
      referenceRegionCode = foundUser.region;
    } else {
      referenceRegionCode = this.phoneNumberService.getRegionCodeISO(
        foundUser.phone!,
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
    try {
      const countDeletedUsersRels = await this.usersRelsRepository.deleteAll({
        type: {neq: 'self'},
        userId: this.userId,
      });

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.groupsRepository.deleteAll({userId: this.userId});
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.dongsRepository.updateAll(
        {groupId: undefined},
        {userId: this.userId},
      );

      return countDeletedUsersRels;
    } catch (err) {
      throw new HttpErrors.NotImplemented(err.message);
    }
  }
}
