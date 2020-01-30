/* eslint-disable prefer-const */
/* eslint-disable require-atomic-updates */
import { inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import { post, getModelSchemaRef, requestBody, HttpErrors, get, param, patch } from '@loopback/rest';

import { Users, FriendRequest, Credentials } from '../models';
import {
  UsersRepository,
  BlacklistRepository,
  VirtualUsersRepository,
  UsersRelsRepository
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
    @repository(VirtualUsersRepository) public virtualUsersRepository: VirtualUsersRepository,
    @repository(BlacklistRepository) public blacklistRepository: BlacklistRepository,
    @repository(UsersRelsRepository) public usersRelsRepository: UsersRelsRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER) public passwordHasher: PasswordHasher,
    @inject(UserServiceBindings.USER_SERVICE) public userService: UserService<Users, Credentials>,
    @inject(TokenServiceBindings.TOKEN_SERVICE) public jwtService: TokenService,
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
              _rev: 'string',
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
  ): Promise<{ _key: string; name: string, accessToken: string }> {
    if (_key !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error users print current user , Token is not matched to this user _key!',
      );
    }

    const user = await this.usersRepository.findById(currentUserProfile[securityId]);
    delete user.password;

    const userProfile = this.userService.convertToUserProfile(user);
    const accessToken = await this.jwtService.generateToken(userProfile);

    return { _key: user._key, name: user.name, accessToken: accessToken };
  }

  @post('/apis/users/{_key}/friend-req', {
    security: OPERATION_SECURITY_SPEC,
    responses: { '200': { description: 'User friend request', }, },
  })
  @authenticate('jwt')
  async friendRequest(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_key') _key: typeof Users.prototype._key,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(FriendRequest, {
            exclude: ["relationKey", "status", "requesterKey"]
          }),
        },
      },
    })
    reqBody: FriendRequest,
  ) {
    if (_key !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error users friend request ,Token is not matched to this user _key!',
      );
    }

    const requesterUser = await this.usersRepository.findById(_key);
    const recipientUser = await this.usersRepository.findOne({
      where: { phone: reqBody.phone },
    });

    if (_key === recipientUser?._key) {
      throw new HttpErrors.NotAcceptable('You are the best friend of yourself! :)');
    }

    const isRealFriend = await this.usersRepository.usersRels(_key).find({
      where: { and: [{ _from: requesterUser?._id }, { _to: recipientUser?._id }] }
    })
    if (isRealFriend.length !== 0) {
      throw new HttpErrors.NotAcceptable('You are real friends already!');
    }

    try {
      const vu = {
        phone: reqBody.phone, usersId: _key, avatar: reqBody.avatar
      };
      const createdVirtualUser = await this.usersRepository.virtualUsers(_key).create(vu);
      const createdUsersRelation = await this.usersRepository.usersRels(_key).create(
        {
          _from: requesterUser?._id, _to: createdVirtualUser._key[1],
          alias: reqBody.alias, type: 'virtual',
        }
      )

      if (requesterUser && recipientUser) {
        const payload = {
          notification: {
            title: 'دنگیپ درخواست دوستی',
            body: `${requesterUser.name} با شماره موبایل ${requesterUser.phone} ازشما درخواست دوستی کرده`,
          },
          data: {
            relationKey: createdUsersRelation._key[0],
            requesterKey: _key,
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
        await admin
          .messaging()
          .sendToDevice(recipientUser.registerationToken, payload, options)
          .then(function (_response) {
            console.log(_response);
          })
          .catch(function (error) {
            console.log(`Sending notification failed, ${error}`);
            // throw new Error(`Sending notification failed, ${error}`);
          });
      }
      createdVirtualUser._key = createdVirtualUser._key[0];
      createdUsersRelation._key = createdUsersRelation._key[0];
      return { createdVirtualUser, createdUsersRelation };
    } catch (error) {
      console.log(error);
      if (error.code === 409) {
        throw new HttpErrors.NotAcceptable('You are virtual friends already!');
      } else {
        throw new HttpErrors.NotAcceptable(error);
      }
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
          schema: getModelSchemaRef(FriendRequest, {
            exclude: ["avatar", "phone"]
          }),
        },
      },
    })
    bodyReq: FriendRequest,
  ) {
    if (_key !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Error users response to friend request ,Token is not matched to this user _key!',
      );
    }
    if (_key === bodyReq.requesterKey) {
      throw new HttpErrors.NotAcceptable("requester's key and recipient's key is the same! ");
    }

    let response = {};
    const recipientUser = await this.usersRepository.findById(_key);
    const requesterUser = await this.usersRepository.findById(bodyReq.requesterKey);
    const usersRelation = await this.usersRelsRepository.findById(bodyReq.relationKey);

    if (recipientUser && requesterUser) {
      const payload: admin.messaging.MessagingPayload = {
        notification: {
          title: '',
          body: '',
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

      if (bodyReq.status) {
        payload.notification = {
          title: 'دنگیپ قبول درخواست دوستی',
          body: `${usersRelation.alias} با موبایل ${recipientUser.phone} در خواست دوستیتون رو پذیرفت`,
        };

        try {
          // Delete created virtual user in friend request
          await this.virtualUsersRepository.deleteById(usersRelation._to.split('/')[1]);
        } catch (error) {
          console.log(error);
          throw new HttpErrors.NotFound('There is not friend request fired!')
        }

        try {
          // Update relation _to property with real-user's _id
          await this.usersRelsRepository.updateById(bodyReq.relationKey, {
            _to: recipientUser._id, type: 'real'
          });
        } catch (error) {
          console.log(error);
          throw new HttpErrors.NotFound('Relation _key is not found')
        }

        // Create relation from recipient to requester
        const usersRel = await this.usersRepository.usersRels(_key).create({
          _from: recipientUser._id, _to: requesterUser._id,
          alias: bodyReq.alias, type: 'real'
        });
        response = { ...usersRel, message: 'You are friends together right now' };
      } else {
        payload.notification = {
          title: 'دنگیپ رد درخواست دوستی',
          body: `${usersRelation.alias} با موبایل ${recipientUser.phone} در خواست دوستیتون رو رد کرد`,
        };
        response = { message: 'Friend request has been rejected' };
      }

      // send response to friend request notification to the requester
      await admin
        .messaging()
        .sendToDevice(requesterUser.registerationToken, payload, options)
        .then(function (_res) {
          console.log(`Successfully set a friend, ${_res}`);
          return { ...response, notifiResponse: _res, relationKey: bodyReq.relationKey };
        })
        .catch(function (error) {
          console.log(`Sending notification failed, ${error}`);
          throw new HttpErrors.Gone(
            `Your are Friends now but sending notification failed`,
          );
        });
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

  @patch('/apis/users/{_key}', {
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
          schema: getModelSchemaRef(Users, {
            partial: true,
            exclude: ["_id", "_key", "_rev", "accountType", "registeredAt", "dongsId", "usersRels",
              "categories", "locale", "geolocation", "password", "phone", "registerationToken"],
          }),
        },
      },
    })
    user: Omit<Users, '_key'>,
  ): Promise<Users> {
    if (_key !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized('Token is not matched to this user _key!');
    }
    await this.usersRepository.updateById(_key, user);
    return this.usersRepository.findById(_key, {
      fields: {
        _rev: true
      }
    });
  }
}
