/* eslint-disable prefer-const */
/* eslint-disable require-atomic-updates */
import { inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import {
  post,
  getModelSchemaRef,
  requestBody,
  HttpErrors,
  get,
  param,
  patch,
} from '@loopback/rest';

import { Users, FriendRequest } from '../models';
import {
  UsersRepository,
  Credentials,
  BlacklistRepository,
  VirtualUsersRepository,
} from '../repositories';
import { authenticate, UserService, TokenService } from '@loopback/authentication';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import { PasswordHasherBindings, UserServiceBindings, TokenServiceBindings } from '../keys';
import { PasswordHasher } from '../services/hash.password.bcryptjs';
import { validatePhoneNumber, validatePassword } from '../services/validator';
import { CredentialsRequestBody, UserProfileSchema } from './specs/user-controller.specs';
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs';
import * as underscore from 'underscore';
import * as admin from 'firebase-admin';
import moment = require('moment');

export class UsersController {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(VirtualUsersRepository)
    public virtualUsersRepository: VirtualUsersRepository,
    @repository(BlacklistRepository) public blacklistRepository: BlacklistRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserService<Users, Credentials>,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
  ) { }

  arrayHasObject(arr: object[], obj: object): boolean {
    for (const ele of arr) {
      if (underscore.isEqual(ele, obj)) {
        return true;
      }
    }
    return false;
  }

  arrayRemoveItem(arr: object[], obj: object) {
    arr.forEach(function (ele) {
      if (underscore.isEqual(ele, obj)) {
        arr.splice(arr.indexOf(ele));
      }
    });
    return arr;
  }

  @get('/apis/users/{phone}/check', {
    responses: {
      '200': {
        description: 'Check this phone number has been registerd or must register now',
        content: {
          'application/json': {
            schema: {
              isRegistered: 'bool',
              name: 'string',
              avatar: 'string',
            },
          },
        },
      },
    },
  })
  @authenticate.skip()
  async checkPhoneNumber(@param.path.string('phone') phone: string): Promise<object> {
    let isRegistered = false;
    let name = 'عضو جدید';
    let avatar = 'dongip';
    // Ensure a valid phone number
    validatePhoneNumber(phone);

    try {
      const user = await this.usersRepository.findOne({
        where: { phone: phone },
      });
      if (user) {
        isRegistered = true;
        name = user.name;
        avatar = user.avatar;
      }
      return { isRegistered, name, avatar };
    } catch (err) {
      console.log(err);
      throw new HttpErrors.NotImplemented(err);
    }
  }

  @post('/apis/users/{phone}/signup', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Users),
          },
        },
      },
    },
  })
  @authenticate.skip()
  async create(
    @param.path.string('phone') phone: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Users, {
            title: 'NewUser',
          }),
        },
      },
    })
    user: Users,
  ): Promise<{ _id: typeof Users.prototype._id; accessToken: string }> {
    // ensure a valid phone and password value
    validatePhoneNumber(phone);
    validatePhoneNumber(user.phone);
    validatePassword(user.password);

    if (phone !== user.phone) {
      throw new HttpErrors.Unauthorized(
        'Error signup, Phone numbers in params and body not matched !',
      );
    }

    // encrypt the password
    user.password = await this.passwordHasher.hashPassword(user.password);
    user.registeredAt = moment().format();

    try {
      // create a new user
      const savedUser = await this.usersRepository.create(user);
      delete user.password;

      //convert a User object into a UserProfile object (reduced set of properties)
      const userProfile = this.userService.convertToUserProfile(savedUser);

      //create a JWT token based on the user profile
      const accessToken = await this.jwtService.generateToken(userProfile);

      return { _id: savedUser._id, accessToken };
    } catch (err) {
      console.log(err);
      if (err.code === 409) {
        throw new HttpErrors.Conflict(`This phone number is already taken.`);
      } else {
        throw new HttpErrors.NotAcceptable(err);
      }
    }
  }

  @post('/apis/users/{phone}/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/josn': {
            schema: {
              type: 'object',
              properties: {
                accessToken: 'string',
                _id: 'string',
              },
            },
          },
        },
      },
    },
  })
  @authenticate.skip()
  async login(
    @param.path.string('phone') phone: string,
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  )
    : Promise<{
      _id: typeof Users.prototype._id,
      _rev: typeof Users.prototype._rev,
      accessToken: string
    }> {
    try {
      let user: Users,
        userProfile: UserProfile,
        accessToken: string;

      if (phone !== credentials.phone) {
        throw new HttpErrors.Unauthorized(
          'Error login, Phone numbers in params and body not matched !',
        );
      }

      //ensure the user exists and the password is correct
      user = await this.userService.verifyCredentials(credentials);

      //convert a User object into a UserProfile object (reduced set of properties)
      userProfile = this.userService.convertToUserProfile(user);
      //create a JWT token bas1ed on the Userprofile
      accessToken = await this.jwtService.generateToken(userProfile);

      await this.usersRepository.updateById(user._id, {
        registerationToken: credentials.registerationToken
      });
      // get new _rev
      user = await this.userService.verifyCredentials(credentials);

      return { _id: user._id, _rev: user._rev, accessToken };
    } catch (err) {
      console.log(err);
      throw new HttpErrors.NotImplemented(err)
    }
  }

  @get('/apis/users/{_id}/logout', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: "Logout current user's client",
      },
    },
  })
  @authenticate('jwt')
  async logout(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.header.string('authorization') authorizationHeader: string,
    @param.path.string('_id') _id: typeof Users.prototype._id,
  ) {
    try {
      if (_id !== currentUserProfile[securityId]) {
        throw new HttpErrors.Unauthorized(
          'Error users logout ,Token is not matched to this user _id!',
        );
      }
      return await this.blacklistRepository.create({ token: authorizationHeader.split(' ')[1] });
    } catch (err) {
      console.log(err);
      if (err.code === 409) {
        throw new HttpErrors.Conflict(`Error logout conflict token, this token is blacklisted already`);
      } else {
        throw new HttpErrors.NotImplemented(`Error logout not implemented: ${err}`)
      }
    }
  }

  @get('/apis/users/{_id}/me', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'The current user profile',
        content: {
          'application/json': {
            schema: UserProfileSchema,
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async printCurrentUser(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_id') _id: typeof Users.prototype._id,
  ): Promise<{ _id: string; name: string }> {
    if (_id !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error users print current user , Token is not matched to this user _id!',
      );
    }

    const user = await this.usersRepository.findById(currentUserProfile[securityId]);
    delete user.password;

    return { _id: user._id, name: user.name };
  }

  @post('/apis/users/{_id}/friend-req', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'User friend request',
      },
    },
  })
  @authenticate('jwt')
  async friendRequest(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_id') _id: typeof Users.prototype._id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(FriendRequest),
        },
      },
    })
    reqBody: FriendRequest,
  ) {
    try {
      if (_id !== currentUserProfile[securityId]) {
        throw new HttpErrors.Unauthorized(
          'Error users friend request ,Token is not matched to this user _id!',
        );
      }

      const requesterUser = await this.usersRepository.findOne({
        where: { _id: currentUserProfile[securityId] },
      });

      const recipientUser = await this.usersRepository.findOne({
        where: { phone: reqBody.phone },
      });

      if (!recipientUser && requesterUser) {
        const vu = {
          avatar: reqBody.avatar,
          name: reqBody.name,
          phone: reqBody.phone,
          usersId: requesterUser._id,
        };

        const preVu = await this.usersRepository.virtualUsers(requesterUser._id).find({
          where: {
            phone: reqBody.phone,
            usersId: requesterUser._id,
          },
        });

        if (preVu.length === 0) {
          const vuResult = await this.usersRepository
            .virtualUsers(requesterUser._id)
            .create(vu);

          return vuResult;
        } else {
          throw new HttpErrors.NotAcceptable('He/She is in your friends list');
        }
      }

      if (requesterUser && recipientUser) {
        if (requesterUser!._id.toString() === recipientUser!._id.toString()) {
          throw new HttpErrors.NotAcceptable('You are the best friend of yourself! :)');
        }

        if (
          !recipientUser.friends.includes(requesterUser._id.toString()) &&
          !this.arrayHasObject(recipientUser.pendingFriends, {
            requester: requesterUser._id.toString(),
            recipient: recipientUser._id.toString(),
          }) &&
          !requesterUser.friends.includes(recipientUser._id.toString()) &&
          !this.arrayHasObject(requesterUser.pendingFriends, {
            requester: requesterUser._id.toString(),
            recipient: recipientUser._id.toString(),
          })
        ) {
          recipientUser.pendingFriends.push({
            requester: requesterUser._id.toString(),
            recipient: recipientUser._id.toString(),
          });
          requesterUser.pendingFriends.push({
            requester: requesterUser._id.toString(),
            recipient: recipientUser._id.toString(),
          });

          await this.usersRepository.updateById(requesterUser._id, requesterUser);
          await this.usersRepository.updateById(recipientUser._id, recipientUser);

          const payload = {
            notification: {
              title: 'دنگیپ درخواست دوستی',
              body: `${requesterUser.name} با موبایل ${requesterUser.phone} ازشما درخواست دوستی کرده`,
            },
            data: {
              name: requesterUser.name,
              phone: requesterUser.phone,
            },
          };
          const options = {
            priority: 'normal',
            contentAvailable: true,
            mutableContent: true,
          };
          const recipUserNotifToken = recipientUser.registerationToken;

          // send friend request notofication to recipient user device
          await admin
            .messaging()
            .sendToDevice(recipUserNotifToken, payload, options)
            .then(function (_response) {
              return {
                message: `Request is sent, wait for response from him/her`,
              };
            })
            .catch(function (error) {
              throw new HttpErrors.NotImplemented(error);
            });
        } else if (
          recipientUser.friends.includes(requesterUser._id.toString()) &&
          requesterUser.friends.includes(recipientUser._id.toString())
        ) {
          return { message: 'You were friends lately' };
        } else if (
          this.arrayHasObject(recipientUser.pendingFriends, {
            requester: requesterUser._id.toString(),
            recipient: recipientUser._id.toString(),
          }) &&
          this.arrayHasObject(requesterUser.pendingFriends, {
            requester: requesterUser._id.toString(),
            recipient: recipientUser._id.toString(),
          })
        ) {
          return { message: 'Request was fired, wait for respone' };
        }
      }
    } catch (err) {
      console.log(err);
      throw new HttpErrors.NotAcceptable(err);
    }
  }

  @post('/apis/users/{_id}/res-friend-req', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Response to friend request ',
      },
    },
  })
  @authenticate('jwt')
  async responseToFriendRequest(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_id') _id: typeof Users.prototype._id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(FriendRequest),
        },
      },
    })
    bodyReq: FriendRequest,
  ) {
    try {
      if (_id !== currentUserProfile[securityId]) {
        throw new HttpErrors.Unauthorized(
          'Error users response to friend request ,Token is not matched to this user _id!',
        );
      }

      let message = '';

      const recipientUser = await this.usersRepository.findOne({
        where: {
          _id: _id,
        },
      });

      const requesterUser = await this.usersRepository.findOne({
        where: {
          phone: bodyReq.phone,
        },
      });

      if (recipientUser && requesterUser) {
        if (requesterUser!._id.toString() === recipientUser!._id.toString()) {
          throw new HttpErrors.NotAcceptable(
            'We believe that you are the best friend of yourself! ;)',
          );
        }

        if (
          !requesterUser.friends.includes(recipientUser._id.toString()) &&
          this.arrayHasObject(requesterUser.pendingFriends, {
            requester: requesterUser._id.toString(),
            recipient: recipientUser._id.toString(),
          }) &&
          !recipientUser.friends.includes(requesterUser._id.toString()) &&
          this.arrayHasObject(recipientUser.pendingFriends, {
            requester: requesterUser._id.toString(),
            recipient: recipientUser._id.toString(),
          })
        ) {
          this.arrayRemoveItem(requesterUser.pendingFriends, {
            requester: requesterUser._id.toString(),
            recipient: recipientUser._id.toString(),
          });
          this.arrayRemoveItem(recipientUser.pendingFriends, {
            requester: requesterUser._id.toString(),
            recipient: recipientUser._id.toString(),
          });

          const payload: admin.messaging.MessagingPayload = {
            notification: {
              title: '',
              body: ``,
            },
            data: {
              name: requesterUser.name,
              phone: requesterUser.phone,
            },
          };
          const options: admin.messaging.MessagingOptions = {
            priority: 'normal',
            contentAvailable: true,
            mutableContent: false,
          };

          if (bodyReq.status === true) {
            recipientUser.friends.push(requesterUser._id.toString());
            requesterUser.friends.push(recipientUser._id.toString());

            payload.notification = {
              title: 'دنگیپ قبول درخواست دوستی',
              body: `${recipientUser.name} با موبایل ${recipientUser.phone} در خواست دوستیتون رو پذیرفت`,
            };

            message = 'You are friends together right now';
          } else if (bodyReq.status === false) {
            payload.notification = {
              title: 'دنگیپ رد درخواست دوستی',
              body: `${recipientUser.name} با موبایل ${recipientUser.phone} در خواست دوستیتون رو رد کرد`,
            };

            message = 'Friend request has been rejected';
          }

          await this.usersRepository.updateById(recipientUser._id, recipientUser);
          await this.usersRepository.updateById(requesterUser._id, requesterUser);

          // send notification accept/reject message to requester of friend request
          const reqUserRegToken = requesterUser.registerationToken;
          await admin
            .messaging()
            .sendToDevice(reqUserRegToken, payload, options)
            .then(function (response) {
              console.log(`Successfully set a friend request, ${response}`);
              return { message: message, firebaseResponse: response };
            })
            .catch(function (error) {
              console.log(`Sending notification failed, ${error}`);
              throw new HttpErrors.NotImplemented(
                `Sending notification failed, ${error}`,
              );
            });
        } else {
          console.log('Friend Request not fired or you were friends lately');
          throw new HttpErrors.NotAcceptable(
            'Friend Request not fired or you were friends lately',
          );
        }
      }
    } catch (err) {
      console.log(err);
      throw new HttpErrors.MethodNotAllowed(err);
    }
  }

  @get('/apis/users/{_id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Users),
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async findById(
    @param.path.string('_id') _id: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<Users> {
    if (_id !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error users findById ,Token is not matched to this user _id!',
      );
    }
    return this.usersRepository.findById(_id);
  }

  @patch('/apis/user/{_id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'User PATCH success',
      },
    },
  })
  @authenticate('jwt')
  async updateById(
    @param.path.string('_id') _id: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Users, { partial: true }),
        },
      },
    })
    user: Users,
  ): Promise<void> {
    if (_id !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized('Token is not matched to this user _id!');
    }
    await this.usersRepository.updateById(_id, user);
  }
}
