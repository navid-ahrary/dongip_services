import {repository, DataObject} from '@loopback/repository';
import {post, get, getModelSchemaRef, requestBody} from '@loopback/rest';
import {intercept, inject} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';

import {JointRequest, JointResponse, JointAccountSubscribes} from '../models';
import {
  JointAccountsRepository,
  JointAccountSubscribesRepository,
  UsersRelsRepository,
  UsersRepository,
} from '../repositories';
import {ValidateUsersRelsInterceptor} from '../interceptors';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {basicAuthorization} from '../services';

@authenticate('jwt.access')
@authorize({allowedRoles: ['GOLD'], voters: [basicAuthorization]})
export class JointAccountController {
  private readonly userId: number;

  constructor(
    @repository(JointAccountsRepository)
    protected jointAccountsRepo: JointAccountsRepository,
    @repository(JointAccountSubscribesRepository)
    protected jointAccSubscribesRepo: JointAccountSubscribesRepository,
    @repository(UsersRelsRepository)
    protected usersRelsRepo: UsersRelsRepository,
    @repository(UsersRepository) protected usersRepo: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {
    this.userId = +this.currentUserProfile[securityId];
  }

  @post('/joint-accounts', {
    summary: 'POST a new JointAccounts',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'JointAccounts model instance',
        content: {
          'application/json': {schema: getModelSchemaRef(JointResponse)},
        },
      },
    },
  })
  @intercept(ValidateUsersRelsInterceptor.BINDING_KEY)
  async createJointAccount(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(JointRequest, {
            title: 'NewJointAccounts',
            includeRelations: false,
          }),
          example: {
            title: 'family',
            description: 'Share credit card, me and wife',
            userRelIds: [1, 11],
          },
        },
      },
    })
    jointAccountsReq: Omit<JointRequest, 'jointAccountsId'>,
  ): Promise<JointResponse> {
    const JA = await this.jointAccountsRepo.create({
      userId: this.userId,
      title: jointAccountsReq.title,
      description: jointAccountsReq.description,
    });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.usersRelsRepo
      .find({
        fields: {userId: true, phone: true},
        where: {
          userId: this.userId,
          userRelId: {inq: jointAccountsReq.userRelIds},
        },
      })
      .then(async (urs) => {
        const users = await this.usersRepo.find({
          where: {phone: {inq: urs.map((u) => u.phone)}},
        });

        const jsList: Array<DataObject<JointAccountSubscribes>> = [];
        for (const userId of users.map((u) => u.getId())) {
          jsList.push({userId, jointAccountId: JA.jointAccountId});
        }
        await this.jointAccSubscribesRepo.createAll(jsList);
      });

    return {
      jointAccountId: JA.getId(),
      createdAt: JA.createdAt,
      ...jointAccountsReq,
    };
  }

  @get('/joint-accounts', {
    summary: 'GET array of all JointAccounts',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      200: {
        'application/json': {
          description: 'Array of JointAccount',
          content: {
            'application/json': {
              schema: {type: 'array', items: getModelSchemaRef(JointResponse)},
            },
          },
        },
      },
    },
  })
  async getJointAccounts(): Promise<JointResponse[]> {
    const result: Array<JointResponse> = [];

    const jsas = await this.jointAccSubscribesRepo.find({
      fields: {jointAccountId: true},
      where: {userId: this.userId},
    });

    const jaIds = jsas.map((jsa) => jsa.jointAccountId);

    const JAs = await this.jointAccountsRepo.find({
      fields: {userId: false},
      where: {jointAccountId: {inq: jaIds}},
      include: [{relation: 'jointAccountSubscribes'}],
    });

    console.log(JAs);

    for (const ja of JAs) {
      const userRelIds: Array<number> = [];
      for (const jas of ja.jointAccountSubscribes) {
        const u = await this.usersRepo.findById(jas.userId, {
          fields: {userId: true, phone: true},
        });

        const userRel = await this.usersRelsRepo.findOne({
          fields: {userRelId: true, userId: true, phone: true},
          where: {userId: this.userId, phone: u.phone},
        });

        userRelIds.push(userRel?.getId());
      }

      result.push(
        new JointResponse({
          jointAccountId: ja.getId(),
          title: ja.title,
          description: ja.title,
          userRelIds: userRelIds,
          createdAt: ja.createdAt,
        }),
      );
    }

    return result;
  }
}
