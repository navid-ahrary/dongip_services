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
  api,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject, service} from '@loopback/core';

import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {UsersRels, VirtualUsers} from '../models';
import {
  UsersRepository,
  VirtualUsersRepository,
  BlacklistRepository,
  UsersRelsRepository,
} from '../repositories';
import {FirebaseService, validatePhoneNumber} from '../services';

@api({
  basePath: '/api/',
  paths: {},
})
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

  @get('/users/users-rels', {
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
    const userId = Number(this.currentUserProfile[securityId]);
    return this.usersRepository.usersRels(userId).find();
  }

  @post('/users/users-rels', {
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
            exclude: ['id', 'belongsToUserId', 'categoryBills', 'type'],
          }),
          example: {
            phone: '+989122222222',
            avatar: '/assets/avatar/avatar_12.png',
            name: 'Samood',
          },
        },
      },
    })
    reqBody: Omit<UsersRels, 'id'>,
  ): Promise<UsersRels> {
    const userId = Number(this.currentUserProfile[securityId]);

    try {
      // validate recipient phone number
      validatePhoneNumber(reqBody.phone);
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.UnprocessableEntity(_err.message);
    }

    let createdVirtualUser: VirtualUsers,
      userRel = Object.assign(
        {type: 'virtual', targetUserId: 0, phone: ''},
        {name: reqBody.name, avatar: reqBody.avatar},
      );

    createdVirtualUser = await this.usersRepository
      .virtualUsers(userId)
      .create({phone: reqBody.phone})
      .catch(async (_err) => {
        console.log(_err);
        if (_err.errno === 1062 && _err.code === 'ER_DUP_ENTRY') {
          throw new HttpErrors[422](`این شماره توی لیست دوستات وجود داره!`);
        }
        throw new HttpErrors.NotAcceptable(_err);
      });

    userRel.targetUserId = createdVirtualUser.getId();
    userRel.phone = createdVirtualUser.phone;

    return this.usersRepository
      .usersRels(userId)
      .create(userRel)
      .catch((_err) => {
        console.log(_err);

        // delete created virtual user
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.virtualUsersRepository.deleteById(createdVirtualUser.getId());

        if (_err.errno === 1062 && _err.code === 'ER_DUP_ENTRY') {
          throw new HttpErrors[422](`این شماره توی لیست دوستات وجود داره!`);
        }
        throw new HttpErrors.NotAcceptable(_err);
      });
  }

  @patch('/users/users-rels/{usersRelsId}', {
    summary: 'Update a userRel by id in path',
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
            exclude: ['id', 'belongsToUserId', 'targetUserId', 'type', 'phone'],
          }),
          examples: {
            someProps: {
              value: {
                name: 'Samood',
                avatar: 'assets/avatar/avatar_1.png',
              },
            },
            singleProp: {
              value: {
                name: 'Samood',
              },
            },
          },
        },
      },
    })
    usersRels: Partial<UsersRels>,
    @param.path.number('usersRelsId')
    usersRelsId: typeof UsersRels.prototype.id,
  ): Promise<void> {
    const userId = Number(this.currentUserProfile[securityId]);
    let count;

    try {
      count = await this.usersRepository.usersRels(userId).patch(usersRels, {
        and: [{belongsToUserId: userId}, {id: usersRelsId}],
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
