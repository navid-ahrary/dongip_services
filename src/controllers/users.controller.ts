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

import { Users, FriendRequest, Credentials } from '../models';
import {
  UsersRepository,
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
import underscore from 'underscore';
import * as admin from 'firebase-admin';
import moment from 'moment';

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
              _key: 'string',
              '_rev': 'string',
              name: 'string',
              avatar: 'string',
            },
          },
        },
      },
    },
  })
  @authenticate.skip()
  async checkPhoneNumber(
    @param.path.string('phone') phone: string,
  ): Promise<object> {
    try {
      let isRegistered = false;
      // Ensure a valid phone number
      validatePhoneNumber(phone);

      const user = await this.usersRepository.findOne({
        where: { phone: phone },
        fields: {
          name: true,
          avatar: true,
          _rev: true,
          _key: true
        },
      });
      if (user) {
        isRegistered = true;
      }
      return { isRegistered, ...user };
    } catch (err) {
      console.log(err.message);
      throw new HttpErrors.MethodNotAllowed(err);
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
  ): Promise<{ _key: typeof Users.prototype._key; accessToken: string }> {
    try {
      // ensure a valid phone and password value
      validatePhoneNumber(phone);
      validatePhoneNumber(user.phone);
      validatePassword(user.password);

      if (phone !== user.phone) {
        throw new Error(
          'Error signup, Phone numbers in params and body not matched !',
        );
      }

      // encrypt the password
      user.password = await this.passwordHasher.hashPassword(user.password);
      user.registeredAt = moment().format();
      // create a new user
      const savedUser = await this.usersRepository.create(user);
      delete user.password;

      //convert a User object into a UserProfile object (reduced set of properties)
      const userProfile = this.userService.convertToUserProfile(savedUser);

      //create a JWT token based on the user profile
      const accessToken = await this.jwtService.generateToken(userProfile);

      return { _key: savedUser._key, accessToken };
    } catch (err) {
      console.log(err);
      if (err.code === 409) {
        throw new HttpErrors.Conflict(`This phone number is already taken.`);
      } else {
        throw new HttpErrors.NotAcceptable(err.message);
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
              type: 'object', properties: { _key: 'string', accessToken: 'string', },
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
    : Promise<{ _key: typeof Users.prototype._key, accessToken: string }
    > {
    try {
      let user: Users,
        userProfile: UserProfile,
        accessToken: string;

      if (phone !== credentials.phone) {
        throw new Error(
          'Error login, Phone numbers in params and body not matched !',
        );
      }

      //ensure the user exists and the password is correct
      user = await this.userService.verifyCredentials(credentials);

      //convert a User object into a UserProfile object (reduced set of properties)
      userProfile = this.userService.convertToUserProfile(user);
      //create a JWT token bas1ed on the Userprofile
      accessToken = await this.jwtService.generateToken(userProfile);

      await this.usersRepository.updateById(user._key, {
        registerationToken: credentials.registerationToken
      });

      return { _key: user._key, accessToken };
    } catch (err) {
      console.log(err);
      throw new HttpErrors.MethodNotAllowed(err.message);
    }
  }

  @get('/apis/users/{_key}/logout', {
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
    @param.path.string('_key') _key: typeof Users.prototype._key,
  ) {
    try {
      if (_key !== currentUserProfile[securityId]) {
        throw new Error(
          'Error users logout ,Token is not matched to this user _key!',
        );
      }
      return await this.blacklistRepository.create({ _key: authorizationHeader.split(' ')[1] });
    } catch (err) {
      console.log(err);
      if (err.code === 409) {
        throw new HttpErrors.Conflict(`Error logout conflict token, this token is blacklisted already`);
      } else {
        throw new HttpErrors.MethodNotAllowed(`Error logout not implemented: ${err.message}`)
      }
    }
  }

  @get('/apis/users/{_key}/me', {
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
    @param.path.string('_key') _key: typeof Users.prototype._key,
  ): Promise<{ _key: string; name: string }> {
    if (_key !== currentUserProfile[securityId]) {
      throw new Error(
        'Error users print current user , Token is not matched to this user _key!',
      );
    }

    const user = await this.usersRepository.findById(currentUserProfile[securityId]);
    delete user.password;

    return { _key: user._key, name: user.name };
  }

  @post('/apis/users/{_key}/friend-req', {
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
    @param.path.string('_key') _key: typeof Users.prototype._key,
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
      if (_key !== currentUserProfile[securityId]) {
        throw new Error(
          'Error users friend request ,Token is not matched to this user _key!',
        );
      }

      const requesterUser = await this.usersRepository.findOne({
        where: { _key: currentUserProfile[securityId] },
      });

      const recipientUser = await this.usersRepository.findOne({
        where: { phone: reqBody.phone },
      });

      if (!recipientUser && requesterUser) {
        const vu = {
          avatar: reqBody.avatar,
          name: reqBody.name,
          phone: reqBody.phone,
          usersId: requesterUser._key,
        };


        const preVu = await this.usersRepository.virtualUsers(vu.usersId).find({
          where: {
            and: [{ phone: reqBody.phone, }, { usersId: requesterUser._key }]
          },
        });

        if (preVu.length === 0) {
          const vuResult = await this.usersRepository
            .virtualUsers(requesterUser.getId())
            .create(vu);

          return vuResult;
        } else {
          throw new Error('He/She is in your friends list');
        }
      } else if (requesterUser && recipientUser) {
        if (requesterUser!.getId() === recipientUser!.getId()) {
          throw new Error('You are the best friend of yourself! :)');
        }

        if (
          !recipientUser.friends.includes(requesterUser.getId()) &&
          !this.arrayHasObject(recipientUser.pendingFriends, {
            requester: requesterUser.getId(),
            recipient: recipientUser.getId(),
          }) &&
          !requesterUser.friends.includes(recipientUser.getId()) &&
          !this.arrayHasObject(requesterUser.pendingFriends, {
            requester: requesterUser.getId(),
            recipient: recipientUser.getId(),
          })
        ) {
          recipientUser.pendingFriends.push({
            requester: requesterUser.getId(),
            recipient: recipientUser.getId(),
          });
          requesterUser.pendingFriends.push({
            requester: requesterUser.getId(),
            recipient: recipientUser.getId(),
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
            .then(function (_response) {
              return {
                message: `Request is sent, wait for response from him/her`,
              };
            })
            .catch(function (error) {
              throw new Error(error);
            });
        } else if (
          recipientUser.friends.includes(requesterUser.getId()) &&
          requesterUser.friends.includes(recipientUser.getId())
        ) {
          throw new Error('You were friends lately');
        } else if (
          this.arrayHasObject(recipientUser.pendingFriends, {
            requester: requesterUser.getId(),
            recipient: recipientUser.getId(),
          }) &&
          this.arrayHasObject(requesterUser.pendingFriends, {
            requester: requesterUser.getId(),
            recipient: recipientUser.getId(),
          })
        ) {
          return { message: 'Request was fired, wait for respone' };
        }
      }
    } catch (err) {
      console.log(err);
      throw new HttpErrors.MethodNotAllowed(err.message);
    }
  }

  @post('/apis/users/{_key}/res-friend-req', {
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
    @param.path.string('_key') _key: typeof Users.prototype._key,
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
      if (_key !== currentUserProfile[securityId]) {
        throw new Error(
          'Error users response to friend request ,Token is not matched to this user _key!',
        );
      }

      let message = '';
      const recipientUser = await this.usersRepository.findOne({
        where: {
          _key: _key,
        },
      });

      const requesterUser = await this.usersRepository.findOne({
        where: {
          phone: bodyReq.phone,
        },
      });

      if (recipientUser && requesterUser) {
        if (requesterUser!.getId() === recipientUser!.getId()) {
          throw new Error(
            'We believe that you are the best friend of yourself! ;)',
          );
        }

        if (
          !requesterUser.friends.includes(recipientUser.getId()) &&
          this.arrayHasObject(requesterUser.pendingFriends, {
            requester: requesterUser.getId(),
            recipient: recipientUser.getId(),
          }) &&
          !recipientUser.friends.includes(requesterUser.getId()) &&
          this.arrayHasObject(recipientUser.pendingFriends, {
            requester: requesterUser.getId(),
            recipient: recipientUser.getId(),
          })
        ) {
          this.arrayRemoveItem(requesterUser.pendingFriends, {
            requester: requesterUser.getId(),
            recipient: recipientUser.getId(),
          });
          this.arrayRemoveItem(recipientUser.pendingFriends, {
            requester: requesterUser.getId(),
            recipient: recipientUser.getId(),
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
            recipientUser.friends.push(requesterUser.getId());
            requesterUser.friends.push(recipientUser.getId());

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

          await this.usersRepository.updateById(recipientUser._key, recipientUser);
          await this.usersRepository.updateById(requesterUser._key, requesterUser);

          // send notification accept/reject message to requester of friend request
          const reqUserRegToken = requesterUser.registerationToken;
          await admin
            .messaging()
            .sendToDevice(reqUserRegToken, payload, options)
            .then(function (response) {
              console.log(`Successfully set a friend, ${response}`);
              return { message, response: response };
            })
            .catch(function (error) {
              console.log(`Sending notification failed, ${error}`);
              throw new Error(
                `Sending notification failed, ${error}`,
              );
            });

        } else {
          console.log('Friend Request not fired or you were friends lately');
          throw new Error(
            'Friend Request not fired or you were friends lately',
          );
        }
      }
    } catch (err) {
      console.log(err);
      throw new HttpErrors.MethodNotAllowed(err.message);
    }
  }

  @get('/apis/users/{_key}', {
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
    @param.path.string('_key') _key: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<Users> {
    if (_key !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error users findById ,Token is not matched to this user _key!',
      );
    }
    return this.usersRepository.findById(_key);
  }

  @patch('/apis/user/{_key}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'User PATCH success',
      },
    },
  })
  @authenticate('jwt')
  async updateById(
    @param.path.string('_key') _key: string,
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
    if (_key !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized('Token is not matched to this user _key!');
    }
    await this.usersRepository.updateById(_key, user);
  }
}
