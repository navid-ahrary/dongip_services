/* eslint-disable prefer-const */
import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject, service} from '@loopback/core';
import Debug from 'debug';
const debug = Debug('dongip');

import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {Users, UsersRels, FriendRequest, VirtualUsers} from '../models';
import {
  UsersRepository,
  VirtualUsersRepository,
  BlacklistRepository,
  UsersRelsRepository,
} from '../repositories';
import {FirebaseService, validatePhoneNumber} from '../services';

export class UsersUsersRelsController {
  constructor(
    @repository(UsersRepository) protected usersRepository: UsersRepository,
    @repository(VirtualUsersRepository)
    public virtualUsersRepository: VirtualUsersRepository,
    @repository(BlacklistRepository)
    public blacklistRepository: BlacklistRepository,
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
    @service(FirebaseService) private firebaseService: FirebaseService,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {}

  private checkUserKey(userKey: string) {
    if (userKey !== this.currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Token is not matched to this user _key!',
      );
    }
  }

  @get('/api/users/users-rels', {
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
  @authenticate('jwt.access')
  async find(): Promise<UsersRels[]> {
    const _userKey = this.currentUserProfile[securityId];
    const userId = 'Users/' + _userKey;

    return this.usersRepository.usersRels(userId).find();
  }

  @post('/api/users/users-rels', {
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
  @authenticate('jwt.access')
  async setFriend(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(FriendRequest, {
            exclude: ['relationId', 'status', 'virtualUserId'],
          }),
          example: {
            phone: '+989122222222',
            avatar: '/assets/avatar/avatar_12.png',
            alias: 'Samood',
          },
        },
      },
    })
    reqBody: FriendRequest,
  ): Promise<UsersRels> {
    const _userKey = this.currentUserProfile[securityId];

    try {
      // validate recipient phone number
      validatePhoneNumber(reqBody.phone);
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.UnprocessableEntity(_err.message);
    }

    let requesterUser: Users,
      recipientUser: Users | VirtualUsers | null,
      createdVirtualUser: VirtualUsers,
      // createdUsersRelation: UsersRels,
      userId = 'Users/' + _userKey,
      // payload,
      userRel = {
        _to: '',
        alias: reqBody.alias,
        avatar: reqBody.avatar,
        type: 'virtual',
        phone: '',
      };

    requesterUser = await this.usersRepository.findById(_userKey);
    recipientUser = await this.usersRepository.findOne({
      where: {phone: reqBody.phone},
    });

    if (recipientUser) {
      if (_userKey === recipientUser._key) {
        throw new HttpErrors.NotAcceptable(
          'You are the best friend of yourself! :)',
        );
      }

      const isRealFriend = await this.usersRepository
        .usersRels(requesterUser._id)
        .find({where: {_to: recipientUser._id}});
      if (isRealFriend.length !== 0) {
        throw new HttpErrors.Conflict('Friendship relation is exist already!');
      }
    }

    createdVirtualUser = await this.usersRepository
      .virtualUsers(userId)
      .create({phone: reqBody.phone})
      .catch(async (_err) => {
        debug(_err);
        if (_err.code === 409) {
          const index =
            _err.response.body.errorMessage.indexOf('conflicting key: ') + 17;

          const virtualUserId =
            'VirtualUsers/' + _err.response.body.errorMessage.slice(index);

          const rel = await this.usersRepository
            .usersRels(userId)
            .find({where: {_to: virtualUserId}});

          throw new HttpErrors.Conflict(
            'You have relation with _key: ' + rel[0]._key,
          );
        }
        throw new HttpErrors.NotAcceptable(_err);
      });

    userRel._to = createdVirtualUser._id;
    userRel.phone = createdVirtualUser.phone;

    return this.usersRepository
      .usersRels(userId)
      .create(userRel)
      .catch((_err) => {
        debug(_err);
        if (_err.code === 409) {
          const index = _err.response.body.errorMessage.indexOf('conflicting');
          throw new HttpErrors.Conflict(
            'Error create user relation ' +
              _err.response.body.errorMessage.slice(index),
          );
        }
        throw new HttpErrors.NotAcceptable(_err);
      });

    // await this.virtualUsersRepository.usersRels(createdVirtualUser._id).create({
    //   _to: requesterUser._id,
    //   alias: requesterUser.name,
    //   avatar: requesterUser.avatar,
    //   type: 'virtual',
    //   phone: requesterUser.phone,
    // });

    // notification
    // if (requesterUser && recipientUser) {
    //   payload = {
    //     notification: {
    //       title: 'دنگیپ درخواست دوستی',
    //       body:
    //         requesterUser.name +
    //         'با شماره موبایل' +
    //         requesterUser.phone +
    //         'ازشما درخواست دوستی کرده',
    //     },
    //     data: {
    //       virtualUserId: createdVirtualUser._key[1],
    //       relationId: createdUsersRelation._key[1],
    //       name: requesterUser.name,
    //       phone: requesterUser.phone,
    //     },
    //   };
    //   const options = {
    //     priority: 'normal',
    //     contentAvailable: true,
    //     mutableContent: false,
    //   };
    //   // send friend request notofication to recipient user client
    //   this.firebaseService.sendToDeviceMessage(
    //     recipientUser.registerationToken,
    //     payload,
    //     options,
    //   );
    // }

    // return {
    //   createdVirtualUser,
    //   createdUsersRelation,
    // };
  }

  // @post('/api/users/users-rels/response-friend-request', {
  //   security: OPERATION_SECURITY_SPEC,
  //   responses: {
  //     '200': {
  //       description: 'Response to friend request ',
  //     },
  //   },
  // })
  // @authenticate('jwt.access')
  // async responseToFriendRequest(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(FriendRequest, {
  //           exclude: ['avatar', 'phone'],
  //         }),
  //       },
  //     },
  //   })
  //   bodyReq: FriendRequest,
  // ) {
  //   const _userKey = this.currentUserProfile[securityId];

  //   let requesterUser: Users | null,
  //     _userId = 'Users/' + _userKey,
  //     ur: UsersRels | null,
  //     recipientUser: Users,
  //     backUserRel: UsersRels,
  //     vu: VirtualUsers,
  //     response = {};

  //   // Find the recipient user
  //   recipientUser = await this.usersRepository.findById(_userKey);
  //   // Find the user relation edge
  //   ur = await this.usersRelsRepository.findOne({
  //     where: {
  //       and: [
  //         {_key: bodyReq.relationId.split('/')[1]},
  //         {_to: bodyReq.virtualUserId},
  //         {targetUsersId: recipientUser._id},
  //       ],
  //     },
  //   });
  //   if (!ur) {
  //     debug('There is not friend request fired!');
  //     throw new HttpErrors.NotFound('There is not fired friend request!');
  //   }
  //   // Check requester and recipient is not the same
  //   if (_userId === ur._from) {
  //     debug("requester's key and recipient's key is the same! ");
  //     throw new HttpErrors.NotAcceptable(
  //       "requester's key and recipient's key is the same! ",
  //     );
  //   }
  //   // Find the requester user
  //   requesterUser = await this.usersRepository.findById(ur._from.split('/')[1]);
  //   if (!requesterUser) {
  //     debug('Requester user is not found! ');
  //     throw new HttpErrors.NotFound('Requester user is not found! ');
  //   }

  //   if (recipientUser && requesterUser) {
  //     const payload = {
  //       notification: {title: '', body: ''},
  //       data: {
  //         alias: ur.alias,
  //         avatar: recipientUser.avatar,
  //         usersRelationId: ur._key[1],
  //       },
  //     };
  //     const options = {
  //       priority: 'normal',
  //       contentAvailable: true,
  //       mutableContent: false,
  //     };

  //     if (bodyReq.status) {
  //       payload.notification = {
  //         title: 'دنگیپ قبول درخواست دوستی',
  //         body:
  //           ur.alias +
  //           'با موبایل' +
  //           recipientUser.phone +
  //           'در خواست دوستیتون رو پذیرفت',
  //       };

  //       try {
  //         vu = await this.virtualUsersRepository.findById(
  //           bodyReq.virtualUserId.split('/')[1],
  //         );
  //         // Delete created virtual user
  //         await this.virtualUsersRepository.deleteById(
  //           bodyReq.virtualUserId.split('/')[1],
  //         );
  //       } catch (error) {
  //         debug('virtualUser deletebyId error' + error);
  //         throw new HttpErrors.NotAcceptable(error.message);
  //       }

  //       try {
  //         // Update relation _to property with real-user's _id
  //         await this.usersRelsRepository.updateById(
  //           bodyReq.relationId.split('/')[1],
  //           {
  //             _to: recipientUser._id,
  //             avatar: recipientUser.avatar,
  //             type: 'real',
  //           },
  //         );
  //       } catch (error) {
  //         // Create deleted virtual user in previous phase
  //         await this.virtualUsersRepository.create(vu);
  //         debug(
  //           'Create deleted virual user again, cause of previous phase error' +
  //             vu,
  //         );
  //         debug('userRels updatebyId error' + error);
  //         throw new HttpErrors.NotAcceptable(error.message);
  //       }

  //       // Create relation from recipient to requester
  //       backUserRel = await this.usersRepository
  //         .usersRels(recipientUser._id)
  //         .create({
  //           _to: requesterUser._id,
  //           alias: bodyReq.alias,
  //           type: 'real',
  //           avatar: requesterUser.avatar,
  //         });
  //       response = {
  //         ...backUserRel,
  //         message: 'You are friends together right now',
  //       };
  //     } else {
  //       payload.notification = {
  //         title: 'دنگیپ رد درخواست دوستی',
  //         body:
  //           ur.alias +
  //           'با موبایل' +
  //           recipientUser.phone +
  //           'در خواست دوستیتون رو رد کرد',
  //       };
  //       response = {message: 'Friend request has been rejected'};
  //     }

  //     // send response to friend request notification to the requester
  //     this.firebaseService.sendToDeviceMessage(
  //       requesterUser.registerationToken,
  //       payload,
  //       options,
  //     );

  //     return response;
  //   }
  // }

  @patch('/api/users/users-rels/{userRelKey}', {
    summary: 'Update a userRel by key in path',
    description:
      'برای تغییر در یک پراپرتی یا چند پراپ، فقط فیلدهای مورد نظر با مقادیر تغییر یافته اش ارسال می شود',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Users.UsersRels PATCH success count',
      },
    },
  })
  @authenticate('jwt.access')
  async patch(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(UsersRels, {
            partial: true,
            exclude: [
              '_key',
              '_id',
              '_from',
              '_to',
              '_rev',
              'type',
              // 'targetUsersId',
              'phone',
            ],
          }),
          examples: {
            multiProps: {
              summary: 'آپدیت چند پراپرتیس همزمان',
              value: {
                alias: 'عبدالعلی',
                avatar: 'assets/avatar/avatar_1.png',
              },
            },
          },
        },
      },
    })
    usersRels: Partial<UsersRels>,
    @param.path.string('userRelKey')
    userRelKey: typeof UsersRels.prototype._key,
  ): Promise<void> {
    const _userKey = this.currentUserProfile[securityId];
    const userId = 'Users/' + _userKey;
    let count;

    try {
      count = await this.usersRepository.usersRels(userId).patch(usersRels, {
        and: [{_from: userId}, {_key: userRelKey}],
      });
    } catch (_err) {
      console.log(_err);
      if (_err.code === 409) {
        const index = _err.response.body.errorMessage.indexOf('conflicting');
        throw new HttpErrors.Conflict(
          _err.response.body.errorMessage.slice(index),
        );
      }
      throw new HttpErrors.NotAcceptable(_err.message);
    }
    if (!count.count) {
      throw new HttpErrors.NotFound('UserRelKey not found!');
    }
  }
}
