/* eslint-disable prefer-const */
import {Filter, repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  param,
  post,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject, service} from '@loopback/core';

import {Dongs} from '../models';
import {UsersRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {DongsService} from '../services';

export class UsersDongsController {
  constructor(
    @service(DongsService) public dongsService: DongsService,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
  ) {}

  private checkUserKey(key: string) {
    if (key !== this.currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Token is not matched to this user _key!',
      );
    }
  }

  @get('/api/users/dongs', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "Array of Dongs's belonging to Users",
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Dongs),
            },
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async find(
    @param.query.object('filter') filter?: Filter<Dongs>,
  ): Promise<Dongs[]> {
    const _userKey = this.currentUserProfile[securityId];
    const _userId = 'Users/' + _userKey;

    return this.usersRepository.dongs(_userId).find(filter);
  }

  @post('/api/users/dongs', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users.Dongs post model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Dongs, {
              exclude: ['belongsToExManId'],
            }),
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dongs, {
            title: 'NewDongsInUsers',
            exclude: ['_key', '_id', '_rev', 'costs', 'belongsToExManId'],
          }),
        },
      },
    })
    dongs: Omit<Dongs, '_key'>,
  ): Promise<Dongs> {
    const _userKey = this.currentUserProfile[securityId];
    const userId = 'Users/' + _userKey;

    return this.dongsService.createNewDong(userId, dongs);
  }
}
