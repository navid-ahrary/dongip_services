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
  ): Promise<{ id: typeof Users.prototype.id; accessToken: string }> {
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

      return { id: savedUser.id, accessToken };
    } catch (err) {
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
                id: 'string',
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
  ): Promise<{ id: typeof Users.prototype.id; accessToken: string }> {
    if (phone !== credentials.phone) {
      throw new HttpErrors.Unauthorized(
        'Error login, Phone numbers in params and body not matched !',
      );
    }

    //ensure the user exists and the password is correct
    const user = await this.userService.verifyCredentials(credentials);

    await this.usersRepository.updateById(user.id, {
      registerationToken: credentials.registerationToken,
    });

    //convert a User object into a UserProfile object (reduced set of properties)
    const userProfile = this.userService.convertToUserProfile(user);

    //create a JWT token based on the user profile
    const accessToken = await this.jwtService.generateToken(userProfile);

    return { id: user.id, accessToken };
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
      if (id !== currentUserProfile[securityId]) {
        throw new HttpErrors.Unauthorized(
          'Error users logout ,Token is not matched to this user id!',
        );
      }
      return await this.blacklistRepository.create({ token: authorizationHeader.split(' ')[1] });
    } catch (err) {
      if (err.code === 409) {
        throw new HttpErrors.Conflict(`Error logout conflict token, this token is blacklisted already`);
      } else {
        throw new HttpErrors.NotImplemented(`Error logout not implemented: ${err}`)
      }
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
  ): Promise<{ id: string; name: string }> {
    if (id !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error users print current user , Token is not matched to this user id!',
      );
    }

    const user = await this.usersRepository.findById(currentUserProfile[securityId]);
    delete user.password;

    return { id: user.id, name: user.name };
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
      if (id !== currentUserProfile[securityId]) {
        throw new HttpErrors.Unauthorized(
          'Error users friend request ,Token is not matched to this user id!',
        );
      }

      const requesterUser = await this.usersRepository.findOne({
        where: { id: currentUserProfile[securityId] },
      });

      const recipientUser = await this.usersRepository.findOne({
        where: { phone: reqBody.phone },
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
          const recipUserNotifToken = recipientUser.registerationToken;

          // send friend request notofication to recipient user device
          await admin
            .messaging()
            .sendToDevice(recipUserNotifToken, payload, options)
            .then(function (response) {
              return {
                message: `Request is sent, wait for response from him/her`,
              };
            })
            .catch(function (error) {
              throw new HttpErrors.NotImplemented(error);
            });
        } else if (
          recipientUser.friends.includes(requesterUser.id.toString()) &&
          requesterUser.friends.includes(recipientUser.id.toString())
        ) {
          return { message: 'You were friends lately' };
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
          return { message: 'Request was fired, wait for respone' };
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
      if (id !== currentUserProfile[securityId]) {
        throw new HttpErrors.Unauthorized(
          'Error users response to friend request ,Token is not matched to this user id!',
        );
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
    if (id !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error users findById ,Token is not matched to this user id!',
      );
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
          schema: getModelSchemaRef(Users, { partial: true }),
        },
      },
    })
    user: Users,
  ): Promise<void> {
    if (id !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized('Token is not matched to this user id!');
    }
    await this.usersRepository.updateById(id, user);
  }
}
