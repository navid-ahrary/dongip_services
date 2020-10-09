import {repository, DataObject, property} from '@loopback/repository';
import {post, getModelSchemaRef, requestBody} from '@loopback/rest';
import {intercept, inject} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';

import {JointAccountRequest, JointSubscribe, Users} from '../models';
import {
  JointAccountsRepository,
  JointSubscribeRepository,
  UsersRelsRepository,
  UsersRepository,
} from '../repositories';
import {ValidateUsersRelsInterceptor} from '../interceptors';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

class JointAccountResponse extends JointAccountRequest {
  @property({
    type: 'number',
    required: false,
  })
  jointAccountId: number;
}

@authenticate('jwt.access')
export class JointAccountController {
  private readonly userId: number;

  constructor(
    @repository(JointAccountsRepository)
    protected jointAccountsRepo: JointAccountsRepository,
    @repository(JointSubscribeRepository)
    protected jointSubscribeRepo: JointSubscribeRepository,
    @repository(UsersRelsRepository)
    protected usersRelsRepo: UsersRelsRepository,
    @repository(UsersRepository) protected usersRepo: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {
    this.userId = +this.currentUserProfile[securityId];
  }

  @post('/joint-accounts', {
    summary: 'Create a joint account',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'JointAccounts model instance',
        content: {
          'application/json': {schema: getModelSchemaRef(JointAccountResponse)},
        },
      },
    },
  })
  @intercept(ValidateUsersRelsInterceptor.BINDING_KEY)
  async createJointAccount(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(JointAccountRequest, {
            title: 'NewJointAccounts',
            includeRelations: false,
          }),
          example: {
            title: 'family',
            description: 'Share credit card, me and wife',
            userRelIds: [1, 5],
          },
        },
      },
    })
    jointAccountsReq: Omit<JointAccountRequest, 'jointAccountsId'>,
  ): Promise<JointAccountResponse> {
    const JA = await this.jointAccountsRepo.create({
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

        const jsList = this.createJSList(
          JA.getId(),
          users.map((u) => u.getId()),
        );
        await this.jointSubscribeRepo.createAll(jsList);
      });

    return {jointAccountId: JA.getId(), ...jointAccountsReq};
  }

  private createJSList(
    jointAccountId: typeof JointSubscribe.prototype.jointAccountId,
    userIds: Array<typeof Users.prototype.userId>,
  ): Array<DataObject<JointSubscribe>> {
    const result: Array<DataObject<JointSubscribe>> = [];
    for (const userId of userIds) result.push({userId, jointAccountId});
    return result;
  }
}
