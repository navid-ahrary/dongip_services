/* eslint-disable prefer-const */
import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where
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

import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {Users, UsersRels, FriendRequest, VirtualUsers} from '../models';
import {
  UsersRepository,
  VirtualUsersRepository,
  BlacklistRepository,
  UsersRelsRepository
} from '../repositories';
import {FirebaseService, validatePhoneNumber} from '../services';
import {SetFriend} from './specs/user-controller.specs';

export class UsersUsersRelsController {
  constructor (
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

  private checkUserKey (userKey: string) {
    if (userKey !== this.currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Token is not matched to this user _key!',
      );
    }
  }


  @get('/api/users/{_userKey}/users-rels', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Users has many rels based on optional filter',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(UsersRels)},
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async find (
    @param.path.string('_userKey') _userKey: string,
    @param.query.object('filter') filter?: Filter<UsersRels>,
  ): Promise<UsersRels[]> {
    this.checkUserKey(_userKey);

    const userId = 'Users/' + _userKey;
    const usersRelsList = await this.usersRepository
      .usersRels(userId).find(filter);
    usersRelsList.forEach(function (usersRel) {
      delete usersRel._to;
      delete usersRel._from;
      delete usersRel.targetUsersId;

    });
    return usersRelsList;
  }


  @post('/api/users/{_userKey}/users-rels/set-friend', {
    security: OPERATION_SECURITY_SPEC,
    responses: SetFriend
  })
  @authenticate('jwt.access')
  async setFriend (
    @param.path.string('_userKey') _userKey: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(FriendRequest, {
            exclude: ["relationId", "status", "virtualUserId"],
          }),
        },
      },
    }) reqBody: FriendRequest,
  ): Promise<{
    createdVirtualUser: VirtualUsers,
    createdUsersRelation: UsersRels;
  }> {
    this.checkUserKey(_userKey);

    // validate recipient phone number
    validatePhoneNumber(reqBody.phone);

    let requesterUser: Users,
      recipientUser: Users | VirtualUsers | null,
      createdVirtualUser: VirtualUsers,
      createdUsersRelation: UsersRels,
      userId = 'Users/' + _userKey,
      payload;

    requesterUser = await this.usersRepository.findById(_userKey);
    recipientUser = await this.usersRepository.findOne({
      where: {phone: reqBody.phone},
    });

    if (recipientUser) {
      if (_userKey === recipientUser._key) {
        throw new HttpErrors.NotAcceptable(
          'You are the best friend of yourself! :)');
      }

      const isRealFriend = await this.usersRepository
        .usersRels(requesterUser._id).find(
          {where: {_to: recipientUser._id}});
      if (isRealFriend.length !== 0) {
        throw new HttpErrors.NotAcceptable('You are real friends already!');
      }
    }

    createdVirtualUser = await this.usersRepository
      .createHumanKindVirtualUsers(userId, {phone: reqBody.phone})
      .catch(async _err => {
        console.log(_err);
        if (_err.code === 409) {
          const index = _err.response.body.errorMessage
            .indexOf('conflicting key: ') + 17;

          const virtualUserId =
            'VirtualUsers/' + _err.response.body.errorMessage.slice(index);

          const rel = await this.usersRepository.usersRels(userId)
            .find({where: {_to: virtualUserId}});

          throw new HttpErrors.Conflict(
            'You have relation with _key: ' + rel[0]._key);
        }
        throw new HttpErrors.NotAcceptable(_err);
      });

    createdUsersRelation = await this.usersRepository
      .createHumanKindUsersRels(userId,
        {
          _to: createdVirtualUser._id,
          alias: reqBody.alias,
          avatar: reqBody.avatar,
          targetUsersId: recipientUser?._id,
          type: 'virtual',
        }).catch(_err => {
          console.log(_err);
          if (_err.code === 409) {
            const index = _err.response.body.errorMessage
              .indexOf('conflicting');
            throw new HttpErrors.Conflict(
              'Error create user relation ' + _err.response.body.errorMessage.
                slice(index));
          }
          throw new HttpErrors.NotAcceptable(_err);
        });
    delete createdUsersRelation.targetUsersId;

    await this.virtualUsersRepository.createHumanKindUsersRels(
      createdVirtualUser._id,
      {
        _to: requesterUser._id,
        alias: requesterUser.name,
        avatar: requesterUser.avatar,
        type: 'virtual'
      }
    );

    if (requesterUser && recipientUser) {
      payload = {
        notification: {
          title: 'دنگیپ درخواست دوستی',
          body: requesterUser.name +
            'با شماره موبایل' +
            requesterUser.phone +
            'ازشما درخواست دوستی کرده'
        },
        data: {
          virtualUserId: createdVirtualUser._key[1],
          relationId: createdUsersRelation._key[1],
          name: requesterUser.name,
          phone: requesterUser.phone,
        },
      };
      const options = {
        priority: 'normal',
        contentAvailable: true,
        mutableContent: false,
      };
      // send friend request notofication to recipient user client
      this.firebaseService.sendToDeviceMessage(
        recipientUser.registerationToken, payload, options);
    }

    return {
      createdVirtualUser,
      createdUsersRelation,
    };
  }


  @post('/api/users/{_userKey}/users-rels/response-friend-request', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Response to friend request ',
      },
    },
  })
  @authenticate('jwt.access')
  async responseToFriendRequest (
    @param.path.string('_userKey') _userKey: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(FriendRequest, {
            exclude: ["avatar", "phone"]
          }),
        },
      },
    }) bodyReq: FriendRequest,
  ) {
    this.checkUserKey(_userKey);

    let requesterUser: Users | null,
      _userId = 'Users/' + _userKey,
      ur: UsersRels | null,
      recipientUser: Users,
      backUserRel: UsersRels,
      vu: VirtualUsers,
      response = {};

    // Find the recipient user
    recipientUser = await this.usersRepository.findById(_userKey);
    // Find the user relation edge
    ur = await this.usersRelsRepository.findOne(
      {
        where: {
          and: [
            {_key: bodyReq.relationId.split('/')[1]},
            {_to: bodyReq.virtualUserId},
            {targetUsersId: recipientUser?._id}
          ]
        }
      });
    if (!ur) {
      console.log('There is not friend request fired!');
      throw new HttpErrors.NotFound('There is not fired friend request!');
    }
    // Check requester and recipient is not the same
    if (_userId === ur._from) {
      console.log("requester's key and recipient's key is the same! ");
      throw new HttpErrors.NotAcceptable(
        "requester's key and recipient's key is the same! ");
    }
    // Find the requester user
    requesterUser = await this.usersRepository.findById(
      ur._from.split('/')[1]
    );
    if (!requesterUser) {
      console.log('Requester user is not found! ');
      throw new HttpErrors.NotFound('Requester user is not found! ');
    }

    if (recipientUser && requesterUser) {
      const payload = {
        notification: {title: '', body: '', },
        data: {
          alias: ur.alias,
          avatar: recipientUser.avatar,
          usersRelationId: ur._key[1]
        },
      };
      const options = {
        priority: 'normal',
        contentAvailable: true,
        mutableContent: false,
      };

      if (bodyReq.status) {
        payload.notification = {
          title: 'دنگیپ قبول درخواست دوستی',
          body: ur.alias +
            'با موبایل' +
            recipientUser.phone +
            'در خواست دوستیتون رو پذیرفت'
        };

        try {
          vu = await this.virtualUsersRepository
            .findById(bodyReq.virtualUserId.split('/')[1]);
          // Delete created virtual user
          await this.virtualUsersRepository.
            deleteById(bodyReq.virtualUserId.split('/')[1]);
        } catch (error) {
          console.log('virtualUser deletebyId error' + error);
          throw new HttpErrors.NotAcceptable(error.message);
        }

        try {
          // Update relation _to property with real-user's _id
          await this.usersRelsRepository.updateById(
            bodyReq.relationId.split('/')[1],
            {
              _to: recipientUser._id,
              avatar: recipientUser.avatar,
              type: 'real',
            }
          );
        } catch (error) {
          // Create deleted virtual user in previous phase
          await this.virtualUsersRepository.create(vu);
          console.log(
            'Create deleted virual user again, cause of previous phase error'
            + vu
          );
          console.log('userRels updatebyId error' + error);
          throw new HttpErrors.NotAcceptable(error.message);
        }

        // Create relation from recipient to requester
        backUserRel = await this.usersRepository.createHumanKindUsersRels(
          recipientUser._id,
          {
            _to: requesterUser._id,
            alias: bodyReq.alias,
            type: 'real',
            avatar: requesterUser.avatar
          });
        response = {
          ...backUserRel,
          message: 'You are friends together right now'
        };
      } else {
        payload.notification = {
          title: 'دنگیپ رد درخواست دوستی',
          body: ur.alias +
            'با موبایل' +
            recipientUser.phone +
            'در خواست دوستیتون رو رد کرد'

        };
        response = {message: 'Friend request has been rejected'};
      }

      // send response to friend request notification to the requester
      this.firebaseService.sendToDeviceMessage(
        requesterUser.registerationToken, payload, options);

      return response;
    }
  }


  @patch('/api/users/{_userKey}/users-rels', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users.UsersRels PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate('jwt.access')
  async patch (
    @param.path.string('_userKey') _userKey: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(UsersRels, {
            partial: true,
            exclude: [
              "_from", "_to", "_rev", "type", "targetUsersId"],
          }),
        },
      },
    })
    usersRels: Partial<UsersRels>,
    @param.query.object('where', getWhereSchemaFor(UsersRels))
    where?: Where<UsersRels>,
  ): Promise<Count> {
    this.checkUserKey(_userKey);

    const userId = 'Users/' + _userKey;
    return this.usersRepository.usersRels(userId)
      .patch(usersRels, where);
  }
}
