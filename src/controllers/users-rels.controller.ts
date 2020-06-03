/* eslint-disable prefer-const */
import {repository, IsolationLevel, Transaction} from '@loopback/repository';
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
export class UsersRelsController {
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

  @get('/users-rels', {
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

  @post('/users-rels', {
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
            exclude: ['userRelId', 'userId', 'type', 'virtualUserId'],
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

    let createdVirtualUser: VirtualUsers,
      userRelObject: UsersRels = Object.assign({
        name: reqBody.name,
        avatar: reqBody.avatar,
        type: 'virtual',
        virtualUserId: 0,
        phone: '',
      }),
      userRepoTx: Transaction,
      createdUserRel: UsersRels;

    try {
      // validate recipient phone number
      validatePhoneNumber(reqBody.phone);
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.UnprocessableEntity(_err.message);
    }

    // Begin Users repo trasaction
    userRepoTx = await this.usersRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );

    try {
      // Create a VirtualUser belongs to current user
      createdVirtualUser = await this.usersRepository
        .virtualUsers(userId)
        .create({phone: reqBody.phone}, {transaction: userRepoTx});

      // Assign props to user rel that would create
      userRelObject.virtualUserId = createdVirtualUser.getId();
      userRelObject.phone = createdVirtualUser.phone;

      // Create a UserRel belongs to current user
      createdUserRel = await this.usersRepository
        .usersRels(userId)
        .create(userRelObject, {transaction: userRepoTx});

      // Commit transaction
      await userRepoTx.commit();
    } catch (err) {
      // Rollback transaction
      await userRepoTx.rollback();

      // Duplicate userId/phone number error handling
      // base on search in stackoverflow, throw a conflict[409] error code
      // see https://stackoverflow.com/questions/12658574/rest-api-design-post-to-create-with-duplicate-data-would-be-integrityerror-500
      if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
        throw new HttpErrors.Conflict(`این شماره توی لیست دوستات وجود داره!`);
      }

      throw new HttpErrors.NotAcceptable(err.message);
    }

    return createdUserRel;
  }

  @patch('/users-rels/{userRelId}', {
    summary: 'Update a userRel by id in path',
    description: 'Just desired properties to update be in reqeust body',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Users.UsersRels PATCH success - No Content',
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
            exclude: ['userId', 'virtualUserId', 'type', 'phone'],
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
    @param.path.number('userRelId', {required: true, example: 30})
    userRelId: typeof UsersRels.prototype.userRelId,
  ): Promise<void> {
    const userId = Number(this.currentUserProfile[securityId]);

    const count = await this.usersRepository
      .usersRels(userId)
      .patch(usersRels, {
        and: [{userRelId: userRelId}],
      })
      .catch((err) => {
        // Duplicate properties error handling
        if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
          throw new HttpErrors.Conflict(err.message);
        }
        throw new HttpErrors.NotAcceptable(err.message);
      });

    if (!count.count) {
      throw new HttpErrors.NotFound(
        'Entity not found: UserRel with id ' + userRelId,
      );
    }
  }
}
