/* eslint-disable prefer-const */
import {repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
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
import {UsersRels, VirtualUsers} from '../models';
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
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(UsersRels, {
            exclude: [
              '_id',
              'belongsToUserId',
              'targetUserId',
              'categoryBills',
              'type',
            ],
          }),
          example: {
            phone: '+989122222222',
            avatar: '/assets/avatar/avatar_12.png',
            alias: 'Samood',
          },
        },
      },
    })
    reqBody: Omit<UsersRels, '_key'>,
  ): Promise<UsersRels> {
    try {
      // validate recipient phone number
      validatePhoneNumber(reqBody.phone);
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.UnprocessableEntity(_err.message);
    }

    const userKey = this.currentUserProfile[securityId];
    const userId = 'Users/' + userKey;

    let createdVirtualUser: VirtualUsers,
      userRel = Object.assign(
        {type: 'virtual', targetUserId: '', phone: ''},
        {alias: reqBody.alias, avatar: reqBody.avatar},
      );

    createdVirtualUser = await this.usersRepository
      .virtualUsers(userId)
      .create({phone: reqBody.phone})
      .catch(async (_err) => {
        console.log(_err);
        if (_err.code === 409) {
          const index =
            _err.response.body.errorMessage.indexOf('conflicting key: ') + 17;

          const virtualUserId =
            'VirtualUsers/' + _err.response.body.errorMessage.slice(index);

          const rel = await this.usersRepository
            .usersRels(userId)
            .find({where: {targetUserId: virtualUserId}});

          throw new HttpErrors.Conflict(
            'You have relation _key: ' + JSON.stringify(rel[0]._key),
          );
        }
        throw new HttpErrors.NotAcceptable(_err);
      });

    userRel.targetUserId = createdVirtualUser._id;
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
  }

  @patch('/api/users/users-rels/{userRelKey}', {
    summary: 'Update a userRel by key in path',
    description: 'Post just desired properties to update',
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
              'belongsToUserId',
              'targetUserId',
              '_rev',
              'type',
              'phone',
            ],
          }),
          examples: {
            someProps: {
              value: {
                alias: 'Samood',
                avatar: 'assets/avatar/avatar_1.png',
              },
            },
            singleProp: {
              value: {
                alias: 'Samood',
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
        and: [{belongsToUserId: userId}, {_key: userRelKey}],
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
