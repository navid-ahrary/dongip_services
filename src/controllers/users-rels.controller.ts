/* eslint-disable prefer-const */
import {
  repository,
  IsolationLevel,
  Transaction,
  Count,
} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  requestBody,
  HttpErrors,
  api,
  del,
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
import _ from 'underscore';

@api({
  basePath: '/api/',
  paths: {},
})
export class UsersRelsController {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(VirtualUsersRepository)
    public virtualUsersRepository: VirtualUsersRepository,
    @repository(BlacklistRepository)
    public blacklistRepository: BlacklistRepository,
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
    @service(FirebaseService) public firebaseService: FirebaseService,
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

    // Create a VirtualUser belongs to current user
    createdVirtualUser = await this.usersRepository
      .virtualUsers(userId)
      .create({phone: reqBody.phone}, {transaction: userRepoTx})
      .catch((err) => {
        // Duplicate phone number error handling in virtual user
        if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
          throw new HttpErrors.Conflict(
            'این شماره تلفن توی لیست دوستات وجود داره',
          );
        }

        throw new HttpErrors.NotAcceptable(err.message);
      });

    // Assign props to user rel that would create
    userRelObject.virtualUserId = createdVirtualUser.getId();
    userRelObject.phone = createdVirtualUser.phone;

    // Create a UserRel belongs to current user
    createdUserRel = await this.usersRepository
      .usersRels(userId)
      .create(userRelObject, {transaction: userRepoTx})
      .catch(async (err) => {
        // Rollback transaction
        await userRepoTx.rollback();

        // Duplicate userRel name error handling
        if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
          throw new HttpErrors.Conflict(
            'این اسم توی لیست دوستات وجود داره، یه اسم دیگه وارد کن',
          );
        }

        throw new HttpErrors.NotAcceptable(err.message);
      });

    // Commit transaction
    await userRepoTx.commit();

    return createdUserRel;
  }

  @patch('/users-rels/{userRelId}', {
    summary: 'Update a userRel by id in path',
    description: 'Just desired properties to update be in reqeust body',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'UsersRels PATCH success - No Content',
      },
    },
  })
  @authenticate('jwt.access')
  async patch(
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(UsersRels, {
            partial: true,
            exclude: ['userId', 'virtualUserId', 'type'],
          }),
          examples: {
            someProps: {
              value: {
                name: 'Samood',
                avatar: 'assets/avatar/avatar_1.png',
                phone: '+989108522580',
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

    // Define variables's type
    let countPatched: Count,
      errorMessage = '';

    try {
      // Patch UserRel
      countPatched = await this.usersRepository
        .usersRels(userId)
        .patch(usersRels, {
          and: [{userRelId: userRelId}, {type: {neq: 'self'}}],
        });

      if (!countPatched.count) {
        errorMessage = 'این رابطه دوستی رو پیدا نکردم';
        throw new HttpErrors.NotFound(errorMessage);
      }

      // Patch related VirtualUser
      const vu = _.pick(usersRels, ['phone']);
      if (vu.phone) {
        await this.usersRepository
          .virtualUsers(userId)
          .patch(vu, {userId: userId});
      }
    } catch (err) {
      // Duplicate error handling
      if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
        // Duplicate name error hanfling
        if (err.sqlMessage.endsWith("'UsersRels.name'")) {
          errorMessage =
            'این اسم توی لیست دوستات وجود داره، یه اسم دیگه وارد کن';
          // Duplicate phone error handling
        } else if (
          err.sqlMessage.endsWith("'UsersRels.phone'") ||
          err.sqlMessage.endsWith("'VirtualUsers.phone'")
        ) {
          errorMessage = 'این شماره توی لیست دوستات وجود داره!';
        }

        throw new HttpErrors.Conflict(errorMessage);
      }
      throw new HttpErrors.NotAcceptable(err.message);
    }

    return;
  }

  @del('/users-rels/{userRelId}', {
    summary: 'Delete a userRel by id',
    description: 'Delete a self-userRel is forbidden',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {description: 'UsersRels DELETE success - No Content'},
    },
  })
  @authenticate('jwt.access')
  async deleteById(
    @param.path.number('userRelId', {required: true, example: 36})
    userRelId: typeof UsersRels.prototype.userRelId,
  ): Promise<void> {
    const userId = Number(this.currentUserProfile[securityId]);

    // Delete a UserRel that "type" is not equal to "self"
    const countDeleted = await this.usersRepository
      .usersRels(userId)
      .delete({and: [{userRelId: userRelId}, {type: {neq: 'self'}}]});

    if (!countDeleted.count) {
      throw new HttpErrors.NotFound('این رابطه دوستی رو پیدا نکردم');
    }

    return;
  }
}
