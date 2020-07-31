import {Count, CountSchema, repository} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  del,
  requestBody,
  api,
  HttpErrors,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject, intercept} from '@loopback/core';
import {Groups} from '../models';
import {
  GroupsRepository,
  UsersRepository,
  DongsRepository,
  BillListRepository,
  PayerListRepository,
} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {ValidateUsersRelsInterceptor} from '../interceptors';
import {ValidateGroupIdInterceptor} from '../interceptors/validate-group-id.interceptor';

@intercept(
  ValidateUsersRelsInterceptor.BINDING_KEY,
  ValidateGroupIdInterceptor.BINDING_KEY,
)
@api({basePath: '/', paths: {}})
@authenticate('jwt.access')
export class GroupsController {
  userId: number;

  constructor(
    @repository(GroupsRepository) protected groupsRepository: GroupsRepository,
    @repository(DongsRepository) protected dongsRepository: DongsRepository,
    @repository(UsersRepository) protected usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
    @repository(PayerListRepository)
    public payerListRepository: PayerListRepository,
    @repository(BillListRepository)
    public billListRepository: BillListRepository,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

  @post('/groups', {
    summary: 'POST a new Groups',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Groups model instance',
        content: {'application/json': {schema: getModelSchemaRef(Groups)}},
      },
    },
  })
  async createGroups(
    @requestBody({
      description: 'Put userRelIds in membersIds list, List cannot be empty',
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(Groups, {
            title: 'NewGroups',
            exclude: ['groupId', 'userId', 'dongs'],
            includeRelations: false,
          }),
          example: {
            title: 'Middle Town Guys',
            icon: '/assets/avatar/people_7.png',
            userRelIds: [14, 41, 59, 95],
          },
        },
      },
    })
    newGroup: Omit<Groups, 'groupId'>,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<Groups> {
    return this.usersRepository.groups(this.userId).create(newGroup);
  }

  @get('/groups', {
    summary: 'GET all Groups',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Groups model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Groups, {includeRelations: false}),
            },
          },
        },
      },
    },
  })
  async findGroups(
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<Groups[]> {
    const userId = this.userId;
    return this.usersRepository.groups(userId).find();
  }

  @patch('/groups/{groupId}', {
    summary: 'PATCH a Groups by groupId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Groups PATCH success',
      },
    },
  })
  async patchGroupsById(
    @param.path.number('groupId', {required: true})
    groupId: typeof Groups.prototype.groupId,
    @requestBody({
      description:
        'To change in userRelIds, set desired userRel ids that, List cannot be empty',
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(Groups, {
            partial: true,
            exclude: ['groupId', 'userId'],
          }),
          example: {
            title: 'Up Town Guys',
            icon: '/assets/avatar/high_people.png',
            userRelIds: [33, 41, 123],
          },
        },
      },
    })
    groups: Groups,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<void> {
    await this.usersRepository
      .groups(this.userId)
      .patch(groups, {groupId: groupId})
      .then((countPatched) => {
        if (!countPatched.count) {
          const errorMessage = 'این گروه رو پیدا نکردم!';
          throw new HttpErrors.NotFound(errorMessage);
        }
      });
  }

  @del('/groups/{groupId}', {
    summary: 'DELETE a Groups by groupId',
    description: 'Also remove groupId from related Dongs',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Groups DELETE success',
      },
    },
  })
  async deleteGroupsById(
    @param.path.number('groupId', {required: true})
    groupId: typeof Groups.prototype.groupId,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<void> {
    try {
      await this.dongsRepository.updateAll(
        {groupId: undefined},
        {groupId: groupId, userId: this.userId},
      );

      const countDeleted = await this.groupsRepository.deleteAll({
        groupId: groupId,
        userId: this.userId,
      });

      if (!countDeleted.count) {
        const errorMessage = 'این گروه رو پیدا نکردم!';
        throw new HttpErrors.NotFound(errorMessage);
      }
    } catch (err) {
      throw new HttpErrors.NotFound(err);
    }
  }

  @del('/groups/', {
    summary: 'DELETE all Groups',
    description: 'Also remove groupId from related Dongs',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Count DELETE Groups',
        content: {
          'application/json': {
            schema: CountSchema,
          },
        },
      },
    },
  })
  async deleteAllGroups(
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<Count> {
    try {
      await this.dongsRepository.updateAll(
        {groupId: undefined},
        {userId: this.userId},
      );

      const countDeleted = await this.groupsRepository.deleteAll({
        userId: this.userId,
      });

      return countDeleted;
    } catch (err) {
      throw new HttpErrors.NotFound(err.message);
    }
  }
}
