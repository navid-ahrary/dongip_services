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
import * as _ from 'lodash';

import {Users, FriendRequest} from '../models';
import {UsersRepository, Credentials, BlacklistRepository} from '../repositories';
import {authenticate, UserService, TokenService} from '@loopback/authentication';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {PasswordHasherBindings, UserServiceBindings, TokenServiceBindings} from '../keys';
import {PasswordHasher} from '../services/hash.password.bcryptjs';
import {validateCredentials} from '../services/validator';
import {CredentialsRequestBody, UserProfileSchema} from './specs/user-controller.specs';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import * as moment from 'moment';
import * as underscore from 'underscore';

export class UsersController {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
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

  @post('/apis/users/signup', {
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
    // ensure a valid phone value adn password value
    validateCredentials(_.pick(user, ['phone', 'password']));

    // encrypt the password
    user.password = await this.passwordHasher.hashPassword(user.password);
    user.registeredAt = moment().format();

    try {
      // create a new user
      const savedUser = await this.usersRepository.create(user);
      delete user.password;

      return {id: savedUser.id};
    } catch (error) {
      if (error.code === 11000) {
        throw new HttpErrors.Conflict(`This phone number is already taken.`);
      } else {
        throw new HttpErrors.NotAcceptable();
      }
    }
  }

  @post('/apis/users/login', {
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
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<{token: string}> {
    //ensure the user exists and the password is correct
    const user = await this.userService.verifyCredentials(credentials);

    //convert a User object into a UserProfile object (reduced set of properties)
    const userProfile = this.userService.convertToUserProfile(user);

    //create a JWT token based on the user profile
    const token = await this.jwtService.generateToken(userProfile);

    return {token};
  }

  @get('/apis/users/logout', {
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
  ) {
    try {
      currentUserProfile.id = currentUserProfile[securityId];
      delete currentUserProfile[securityId];

      await this.blacklistRepository.addTokenToBlacklist(
        currentUserProfile.id,
        authorizationHeader.split(' ')[1],
      );
    } catch (error) {
      throw new HttpErrors.Unauthorized('Error logout');
    }
  }

  @get('/apis/users/me', {
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
  ): Promise<object> {
    currentUserProfile.id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];
    delete currentUserProfile.token;

    const user = await this.usersRepository.findById(currentUserProfile.id);
    delete user.password;

    return {id: user.id, name: user.name};
  }

  @post('/apis/users/friend_request', {
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
      const requesterUser = await this.usersRepository.findOne({
        where: {id: currentUserProfile[securityId]},
      });

      const recipientUser = await this.usersRepository.findOne({
        where: {phone: reqBody.phone},
      });

      if (requesterUser!.id.toString() === recipientUser!.id.toString()) {
        throw new HttpErrors.UnavailableForLegalReasons(
          'We believe you are the best friend of yourself! :)',
        );
      }

      if (requesterUser && recipientUser) {
        if (
          !recipientUser.friendIds.includes(requesterUser.id.toString()) &&
          !this.arrayHasObject(recipientUser.pendingFriendIds, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          }) &&
          !requesterUser.friendIds.includes(recipientUser.id.toString()) &&
          !this.arrayHasObject(requesterUser.pendingFriendIds, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          })
        ) {
          recipientUser.pendingFriendIds.push({
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          });
          requesterUser.pendingFriendIds.push({
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          });

          await this.usersRepository.updateById(requesterUser.getId(), requesterUser);
          await this.usersRepository.updateById(recipientUser.getId(), recipientUser);

          return {
            message: 'Request is sent, wait for response from him/her',
          };
        } else {
          throw new HttpErrors.TooManyRequests('Request is fired');
        }
      }
    } catch (err) {
      throw new HttpErrors.NotAcceptable(err);
    }
  }

  @post('/apis/users/friend_accept', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Friend request acceptance',
      },
    },
  })
  @authenticate('jwt')
  async friendAccept(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
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
      const recipientUser = await this.usersRepository.findOne({
        where: {
          id: currentUserProfile[securityId],
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
            'We believe you are the best friend of yourself! ;)',
          );
        }

        for (const pending of recipientUser.pendingFriendIds) {
          if (recipientUser.id.toString() !== pending.recipient) {
            throw new HttpErrors.NotAcceptable(
              'Just recipient must response to friend request',
            );
          }
        }

        if (
          !requesterUser.friendIds.includes(recipientUser.id.toString()) &&
          this.arrayHasObject(requesterUser.pendingFriendIds, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          }) &&
          !recipientUser.friendIds.includes(requesterUser.id.toString()) &&
          this.arrayHasObject(recipientUser.pendingFriendIds, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          })
        ) {
          this.arrayRemoveItem(requesterUser.pendingFriendIds, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          });
          this.arrayRemoveItem(recipientUser.pendingFriendIds, {
            requester: requesterUser.id.toString(),
            recipient: recipientUser.id.toString(),
          });

          console.log(recipientUser);

          if (bodyReq.status === true) {
            recipientUser.friendIds.push(requesterUser.id.toString());
            requesterUser.friendIds.push(recipientUser.id.toString());
          } else if (bodyReq.status === false) {
            return {
              message: 'Friend request rejected',
            };
          }

          await this.usersRepository.updateById(recipientUser.id, recipientUser);
          await this.usersRepository.updateById(requesterUser.id, requesterUser);

          return {
            message: 'You are friends together now',
          };
        } else {
          throw new HttpErrors.NotImplemented(
            'Friend Request not fired or you were friends lately',
          );
        }
      } else {
        throw new HttpErrors.NotFound("This 'user' not found");
      }
    } catch (err) {
      throw new HttpErrors.NotAcceptable(err);
    }
  }

  @get('/apis/users/{id}', {
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
    return this.usersRepository.findById(id);
  }

  @patch('/apis/user/{id}', {
    responses: {
      '204': {
        description: 'User PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Users, {partial: true}),
        },
      },
    })
    user: Users,
  ): Promise<void> {
    await this.usersRepository.updateById(id, user);
  }
}
