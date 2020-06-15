/* eslint-disable prefer-const */
import {
  repository,
  Transaction,
  IsolationLevel,
  model,
  Model,
  property,
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
import {inject, service, intercept} from '@loopback/core';

import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {UsersRels} from '../models';
import {
  UsersRepository,
  VirtualUsersRepository,
  BlacklistRepository,
  UsersRelsRepository,
} from '../repositories';
import {FirebaseService} from '../services';
import _ from 'underscore';
import {
  ValidatePhoneNumInterceptor,
  FirebasetokenInterceptor,
} from '../interceptors';

@model()
class FindFriendsReponseItemModel extends Model {
  @property({type: 'string'})
  name: string;
  @property({type: 'string'})
  phone: string;
  @property({type: 'string'})
  avatar: string;
}

@api({
  basePath: '/api/',
  paths: {},
})
@intercept(
  ValidatePhoneNumInterceptor.BINDING_KEY,
  FirebasetokenInterceptor.BINDING_KEY,
)
@authenticate('jwt.access')
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
  async find(
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<UsersRels[]> {
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
  async createUsersRels(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(UsersRels, {
            exclude: ['userRelId', 'userId', 'type'],
          }),
          example: {
            phone: '+989122222222',
            avatar: '/assets/avatar/avatar_12.png',
            name: 'Samood',
          },
        },
      },
    })
    userRelReqBody: Omit<UsersRels, 'id'>,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<UsersRels> {
    const userId = Number(this.currentUserProfile[securityId]),
      userRelObject: UsersRels = new UsersRels({
        name: userRelReqBody.name,
        avatar: userRelReqBody.avatar,
        type: 'virtual',
        phone: userRelReqBody.phone,
      });

    // Check phone number is not user's
    await this.usersRepository
      .count({
        userId: userId,
        phone: userRelReqBody.phone,
      })
      .then((result) => {
        if (result.count)
          throw new HttpErrors.UnprocessableEntity('تو بهترین دوست خودتی!');
      });

    // Create a UserRel belongs to current user
    const createdUserRel: UsersRels = await this.usersRepository
      .usersRels(userId)
      .create(userRelObject)
      .catch((err) => {
        // Duplicate error handling
        if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
          let errorMessage: string;

          // Duplicate name&phone error handling
          if (err.sqlMessage.endsWith("'UsersRels.name&phone'")) {
            errorMessage = 'یه دوست داری دقیقن به همین اسم و شماره موبایل!';
            // Duplicate name error handling
          } else if (err.sqlMessage.endsWith("'UsersRels.name'")) {
            errorMessage = 'این اسم توی لیست دوستات وجود داره!';
            // Duplicate phone error handling
          } else if (err.sqlMessage.endsWith("'UsersRels.phone'")) {
            errorMessage = 'این شماره موبایل توی لیست دوستات وجود داره!';
          } else errorMessage = err.message; // Otherwise

          throw new HttpErrors.Conflict(errorMessage);
        }

        throw new HttpErrors.NotAcceptable(err.message);
      });

    // Create a VirtualUser belongs to current user
    await this.usersRepository
      .virtualUsers(userId)
      .create({phone: userRelReqBody.phone, userRelId: createdUserRel.getId()});

    return createdUserRel;
  }

  @patch('/users-rels/{userRelId}', {
    summary: 'Update a UsersRels by id',
    description: 'Send just desired properties to update',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'UserRels PATCH success - No Content',
      },
    },
  })
  async patchUsersRels(
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(UsersRels, {
            partial: true,
            exclude: ['userId', 'type'],
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
    userRelReqBody: Partial<UsersRels>,
    @param.path.number('userRelId', {required: true, example: 30})
    userRelId: typeof UsersRels.prototype.userRelId,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<void> {
    const userId = Number(this.currentUserProfile[securityId]);

    let errorMessage: string;

    try {
      // Patch UserRel
      await this.usersRepository
        .usersRels(userId)
        .patch(userRelReqBody, {
          and: [{userRelId: userRelId}, {type: {neq: 'self'}}],
        })
        .then((countPatched) => {
          if (!countPatched.count) {
            errorMessage = 'این رابطه دوستی رو پیدا نکردم!';
            throw new HttpErrors.NotFound(errorMessage);
          }
        });

      // Patch related VirtualUser entity
      const vu = _.pick(userRelReqBody, ['phone']);
      if (vu.phone) {
        await this.usersRelsRepository
          .hasOneVirtualUser(userRelId)
          .patch(vu, {userId: userId});
      }
    } catch (err) {
      // Duplicate error handling
      if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
        // Duplicate name error hanfling
        if (err.sqlMessage.endsWith("'UsersRels.name'")) {
          errorMessage = 'این اسم توی لیست دوستات وجود داره!';
          // Duplicate phone error handling
        } else if (
          err.sqlMessage.endsWith("'UsersRels.phone'") ||
          err.sqlMessage.endsWith("'VirtualUsers.phone'")
        ) {
          errorMessage = 'این شماره توی لیست دوستات وجود داره!';
        } else {
          errorMessage = 'خطای مدیریت نشده ' + err.message;
        }
        throw new HttpErrors.Conflict(errorMessage);
      }
      throw new HttpErrors.NotAcceptable(err.message);
    }
  }

  @del('/users-rels/{userRelId}', {
    summary: 'Delete a UsersRels by id',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {description: 'UsersRels DELETE success - No Content'},
    },
  })
  async deleteById(
    @param.path.number('userRelId', {required: true, example: 36})
    userRelId: typeof UsersRels.prototype.userRelId,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<void> {
    const userId = Number(this.currentUserProfile[securityId]);

    // begin userRepo transaction
    const usersRepoTx: Transaction = await this.usersRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );

    await this.usersRepository
      .usersRels(userId)
      .delete(
        {and: [{userRelId: userRelId}, {type: {neq: 'self'}}]},
        {transaction: usersRepoTx},
      )
      .then((countDeleted) => {
        if (!countDeleted.count) {
          throw new HttpErrors.NotFound('این رابطه دوستی رو پیدا نکردم');
        }
      });

    await this.usersRepository
      .virtualUsers(userId)
      .delete({userRelId: userRelId}, {transaction: usersRepoTx})
      .catch(async (err) => {
        // Rollback transaction
        await usersRepoTx.rollback();
        throw new HttpErrors.NotImplemented(err.message);
      });

    // Commit transaction
    await usersRepoTx.commit();
  }

  @post('/users-rels/find-friends', {
    summary: "Get Arrays of user's phone number those registered at dongip",
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of phone, name, avatar',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(FindFriendsReponseItemModel),
            },
          },
        },
      },
    },
  })
  async findContacts(
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {type: 'string'},
            example: ['+989176502184', '+989387401240'],
          },
        },
      },
    })
    phones: string[],
  ): Promise<Partial<FindFriendsReponseItemModel>[]> {
    // Generate filter object
    let where: {or: {phone: string}[]} = {or: []};
    phones.forEach((phone) => {
      where.or.push({phone: phone});
    });

    // Get phones those exist in database
    const foundUsers = await this.usersRepository
      .find({where: where})
      .catch((err) => {
        throw new HttpErrors.NotImplemented(err.message);
      });

    // Generate resposne entity
    let phonesExists: Partial<FindFriendsReponseItemModel>[] = [];
    foundUsers.forEach((userObject) => {
      phonesExists.push({
        name: userObject.name,
        phone: userObject.phone,
        avatar: userObject.avatar,
      });
    });

    return phonesExists;
  }

  @del('/users-rels', {
    summary: "Delete all user's UsersRels ",
    security: OPERATION_SECURITY_SPEC,
    responses: {'200': {description: 'Count deleted UsersRels'}},
  })
  async deleteAllUsersRels() {
    const userId = Number(this.currentUserProfile[securityId]);
    return this.usersRepository.usersRels(userId).delete({type: {neq: 'self'}});
  }
}
