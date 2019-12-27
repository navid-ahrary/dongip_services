/* eslint-disable require-atomic-updates */
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  post,
  getModelSchemaRef,
  requestBody,
  HttpErrors,
  get,
  param,
  patch,
} from '@loopback/rest';

import {Users, FriendRequest} from '../models';
import {
  UsersRepository,
  Credentials,
  BlacklistRepository,
  VirtualUsersRepository,
} from '../repositories';
import {authenticate, UserService, TokenService} from '@loopback/authentication';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {PasswordHasherBindings, UserServiceBindings, TokenServiceBindings} from '../keys';
import {PasswordHasher} from '../services/hash.password.bcryptjs';
import {validatePhoneNumber, validatePassword} from '../services/validator';
import {CredentialsRequestBody, UserProfileSchema} from './specs/user-controller.specs';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
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
  ) {}

  arrayHasObject(arr: object[], obj: object): boolean {
    for (const ele of arr) {
      if (underscore.isEqual(ele, obj)) {
        return true;
      }
    }
    return false;
  }

  arrayRemoveItem(arr: object[], obj: object) {
    arr.forEach(function(ele) {
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
            },
          },
        },
      },
    },
  })
  async checkPhoneNumber(@param.path.string('phone') phone: string): Promise<object> {
    let isRegistered = false;
    let name = 'عضو جدید';
    let avatar = 'dongip';
    // Ensure a valid phone number
    validatePhoneNumber(phone);

    try {
      const user = await this.usersRepository.findOne({
        where: {phone: phone},
      });
      if (user) {
        isRegistered = true;
        name = user.name;
        avatar = user.avatar;
      }
      return {isRegistered, name, avatar};
    } catch (err) {
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
  ): Promise<object> {
    // ensure a valid phone and password value
    validatePhoneNumber(phone);
    validatePhoneNumber(user.phone);
    validatePassword(user.password);

    // encrypt the password
    user.password = await this.passwordHasher.hashPassword(user.password);
    user.registeredAt = moment().format();

    try {
      // create a new user
      const savedUser = await this.usersRepository.create(user);
      delete user.password;

      return {id: savedUser.id};
    } catch (err) {
      if (err.code === 11000) {
        throw new HttpErrors.Conflict(`This phone number is already taken.`);
      } else {
        throw new HttpErrors.NotAcceptable();
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
                token: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @param.path.string('phone') phone: string,
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<{accessToken: string}> {
    //ensure the user exists and the password is correct
    const user = await this.userService.verifyCredentials(credentials);

    //convert a User object into a UserProfile object (reduced set of properties)
    const userProfile = this.userService.convertToUserProfile(user);

    //create a JWT token based on the user profile
    const accessToken = await this.jwtService.generateToken(userProfile);

    return {accessToken};
  }

  @get('/apis/users/{id}/logout', {
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
    @param.path.string('id') id: typeof Users.prototype.id,
  ) {
    try {
      currentUserProfile.id = currentUserProfile[securityId];
      delete currentUserProfile[securityId];

      if (id !== currentUserProfile.id) {
        throw new HttpErrors.Unauthorized('Token is not matched to this user id!');
      }

      await this.blacklistRepository.addTokenToBlacklist(
        currentUserProfile.id,
        authorizationHeader.split(' ')[1],
      );
    } catch (err) {
      throw new HttpErrors.Unauthorized('Error logout');
    }
  }

  @get('/apis/users/{id}/me', {
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
    @param.path.string('id') id: typeof Users.prototype.id,
  ): Promise<{id: string; name: string}> {
    currentUserProfile.id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];

    if (id !== currentUserProfile.id) {
      throw new HttpErrors.Unauthorized('Token is not matched to this user id!');
    }

    const user = await this.usersRepository.findById(currentUserProfile.id);
    delete user.password;

    return {id: user.id, name: user.name};
  }

  @post('/apis/users/{id}/friend-req', {
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
    @param.path.string('id') id: typeof Users.prototype.id,
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
      currentUserProfile.id = currentUserProfile[securityId];
      delete currentUserProfile[securityId];

      if (id !== currentUserProfile.id) {
        throw new HttpErrors.Unauthorized('Token is not matched to this user id!');
      }

      const requesterUser = await this.usersRepository.findOne({
        where: {id: currentUserProfile.id},
      });

      const recipientUser = await this.usersRepository.findOne({
        where: {phone: reqBody.phone},
      });

      if (!recipientUser && requesterUser) {
        const vu = {
          avatar: reqBody.avatar,
          name: reqBody.name,
          phone: reqBody.phone,
          usersId: requesterUser.id,
        };

        const preVu = await this.usersRepository.virtualUsers(requesterUser.id).find({
          where: {
            phone: reqBody.phone,
            usersId: requesterUser.id,
          },
        });

        if (!preVu) {
          const vuResult = await this.usersRepository
            .virtualUsers(requesterUser.id)
            .create(vu);

          return vuResult;
        } else if (preVu) {
          throw new HttpErrors.NotAcceptable('He/She is in your friends list');
        }
      }

      if (requesterUser && recipientUser) {
        if (requesterUser!.id.toString() === recipientUser!.id.toString()) {
          throw new HttpErrors.NotAcceptable('You are the best friend of yourself! :)');
        }

        if (
          !recipientUser.friends.includes(requesterUser.id.toString()) &&
          !this.arrayHasObject(recipientUser.pendingFriends, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          }) &&
          !requesterUser.friends.includes(recipientUser.id.toString()) &&
          !this.arrayHasObject(requesterUser.pendingFriends, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          })
        ) {
          recipientUser.pendingFriends.push({
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          });
          requesterUser.pendingFriends.push({
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          });

          await this.usersRepository.updateById(requesterUser.getId(), requesterUser);
          await this.usersRepository.updateById(recipientUser.getId(), recipientUser);

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
          const recipUserNotifToken = recipientUser.deviceToken;

          // send friend request notofication to recipient user device
          await admin
            .messaging()
            .sendToDevice(recipUserNotifToken, payload, options)
            .then(function(response) {
              return {
                message: `Request is sent, wait for response from him/her`,
              };
            })
            .catch(function(error) {
              throw new HttpErrors.NotImplemented(error);
            });
        } else if (
          recipientUser.friends.includes(requesterUser.id.toString()) &&
          requesterUser.friends.includes(recipientUser.id.toString())
        ) {
          return {message: 'You were friends lately'};
        } else if (
          this.arrayHasObject(recipientUser.pendingFriends, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          }) &&
          this.arrayHasObject(requesterUser.pendingFriends, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          })
        ) {
          return {message: 'Request was fired, wait for respone'};
        }
      }
    } catch (err) {
      throw new HttpErrors.NotAcceptable(err);
    }
  }

  @post('/apis/users/{id}/res-friend-req', {
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
    @param.path.string('id') id: typeof Users.prototype.id,
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
      currentUserProfile.id = currentUserProfile[securityId];
      delete currentUserProfile[securityId];

      if (id !== currentUserProfile.id) {
        throw new HttpErrors.Unauthorized('Token is not matched to this user id!');
      }

      let message = '';

      const recipientUser = await this.usersRepository.findOne({
        where: {
          id: id,
        },
      });

      const requesterUser = await this.usersRepository.findOne({
        where: {
          phone: bodyReq.phone,
        },
      });

      if (recipientUser && requesterUser) {
        if (requesterUser!.id.toString() === recipientUser!.id.toString()) {
          throw new HttpErrors.NotAcceptable(
            'We believe that you are the best friend of yourself! ;)',
          );
        }

        if (
          !requesterUser.friends.includes(recipientUser.id.toString()) &&
          this.arrayHasObject(requesterUser.pendingFriends, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          }) &&
          !recipientUser.friends.includes(requesterUser.id.toString()) &&
          this.arrayHasObject(recipientUser.pendingFriends, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          })
        ) {
          this.arrayRemoveItem(requesterUser.pendingFriends, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          });
          this.arrayRemoveItem(recipientUser.pendingFriends, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          });

          const payload = {
            notification: {
              title: '',
              body: ``,
            },
            data: {
              name: requesterUser.name,
              phone: requesterUser.phone,
            },
          };
          const options = {
            priority: 'normal',
            contentAvailable: true,
            mutableContent: false,
          };

          if (bodyReq.status === true) {
            recipientUser.friends.push(requesterUser.id.toString());
            requesterUser.friends.push(recipientUser.id.toString());

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

          await this.usersRepository.updateById(recipientUser.id, recipientUser);
          await this.usersRepository.updateById(requesterUser.id, requesterUser);

          // send notification accept/reject message to requester of friend request
          const reqUserNotifToken = requesterUser.deviceToken;
          await admin
            .messaging()
            .sendToDevice(reqUserNotifToken, payload, options)
            .then(function(response) {
              return {message: message, firebaseResponse: response};
            })
            .catch(function(error) {
              throw new HttpErrors.NotAcceptable(error);
            });
        } else {
          throw new HttpErrors.NotAcceptable(
            'Friend Request not fired or you were friends lately',
          );
        }
      }
    } catch (err) {
      throw new HttpErrors.MethodNotAllowed(err);
    }
  }

  @get('/apis/users/{id}', {
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
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<Users> {
    currentUserProfile.id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];

    if (id !== currentUserProfile.id) {
      throw new HttpErrors.Unauthorized('Token is not matched to this user id!');
    }
    return this.usersRepository.findById(id);
  }

  @patch('/apis/user/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'User PATCH success',
      },
    },
  })
  @authenticate('jwt')
  async updateById(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Users, {partial: true}),
        },
      },
    })
    user: Users,
  ): Promise<void> {
    currentUserProfile.id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];

    if (id !== currentUserProfile.id) {
      throw new HttpErrors.Unauthorized('Token is not matched to this user id!');
    }
    await this.usersRepository.updateById(id, user);
  }
}
