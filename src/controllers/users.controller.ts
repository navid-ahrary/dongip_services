/* eslint-disable require-atomic-updates */
import {inject} from '@loopback/core';
import {Filter, repository, CountSchema, Where, Count} from '@loopback/repository';
import {
  post,
  getModelSchemaRef,
  requestBody,
  HttpErrors,
  get,
  getWhereSchemaFor,
  param,
  getFilterSchemaFor,
  patch,
} from '@loopback/rest';
import * as _ from 'lodash';

import {User} from '../models';
import {UsersRepository, Credentials} from '../repositories';
import {authenticate, UserService, TokenService} from '@loopback/authentication';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {PasswordHasherBindings, UserServiceBindings, TokenServiceBindings} from '../keys';
import {PasswordHasher} from '../services/hash.password.bcryptjs';
import {validateCredentials} from '../services/validator';
import {CredentialsRequestBody, UserProfileSchema} from './specs/user-controller.specs';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import * as moment from 'moment';

export class UsersController {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserService<User, Credentials>,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
  ) {}

  @post('/users/signup', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: getModelSchemaRef(User),
          },
        },
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {
            title: 'NewUser',
          }),
        },
      },
    })
    user: User,
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

  @post('/users/login', {
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
    user.token = token;

    //add the token of the current client to the tokens list of user
    user.tokens = user.tokens.concat([{token}]);

    await this.usersRepository.updateById(user.id, user);

    return {token};
  }

  @get('/users/logout', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: "Logout current user's client",
      },
    },
  })
  @authenticate('jwt')
  async logout(@inject(SecurityBindings.USER) currentUserProfile: UserProfile) {
    try {
      currentUserProfile.id = currentUserProfile[securityId];
      delete currentUserProfile[securityId];

      const user = await this.usersRepository.findById(currentUserProfile.id);
      user.blacklist.concat();
    } catch (error) {
      throw new HttpErrors.Unauthorized();
    }
  }

  @get('/users/me', {
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
  ): Promise<UserProfile> {
    currentUserProfile.id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];
    return currentUserProfile;
  }

  @get('/users/count', {
    responses: {
      '200': {
        description: 'User model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @param.query.object('where', getWhereSchemaFor(User)) where?: Where<User>,
  ): Promise<Count> {
    return this.usersRepository.count(where);
  }

  @get('/user', {
    responses: {
      '200': {
        description: 'Array of User model instances',
        content: {
          'application/josn': {
            schema: {type: 'array', items: getModelSchemaRef(User)},
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async find(
    @param.query.object('filter', getFilterSchemaFor(User))
    filter?: Filter<User>,
  ): Promise<User[]> {
    return this.usersRepository.find(filter);
  }

  @get('/users/{id}', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(User),
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async findById(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<User> {
    currentUserProfile.id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];
    return this.usersRepository.findById(id);
  }

  @patch('/user/{id}', {
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
          schema: getModelSchemaRef(User, {partial: true}),
        },
      },
    })
    user: User,
  ): Promise<void> {
    await this.usersRepository.updateById(id, user);
  }
}
