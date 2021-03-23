import { inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import { get, getModelSchemaRef, HttpErrors, param, RequestContext } from '@loopback/rest';
import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { SecurityBindings, securityId } from '@loopback/security';
import { authorize } from '@loopback/authorization';
import _ from 'lodash';
import { Dongs, Users } from '../models';
import { JointAccountsRepository, JointAccountSubscribesRepository } from '../repositories';
import { basicAuthorization } from '../services';
import { LocalizedMessages } from '../types';
import { LocMsgsBindings } from '../keys';
import { CurrentUserProfile } from '../interfaces';

@authenticate('jwt.access')
@authorize({ allowedRoles: ['GOLD'], voters: [basicAuthorization] })
export class JointAccountsDongsController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly lang: string;

  constructor(
    @inject.context() public ctx: RequestContext,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
    @repository(JointAccountSubscribesRepository)
    public jointAccSubRepo: JointAccountSubscribesRepository,
    @repository(JointAccountsRepository) public jointAccountsRepository: JointAccountsRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  @get('/joint-accounts/{jointAccountId}/dongs', {
    summary: 'Get Dongs belogs to JointAccount by jointAccountId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of JointAccounts has many Dongs',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(Dongs) },
          },
        },
      },
    },
  })
  async findDongsBelongsToJointAccount(
    @param.path.number('jointAccountId') jointAccountId: number,
  ) {
    const JAS = await this.jointAccSubRepo.findOne({
      where: { userId: this.userId, jointAccountId: jointAccountId },
      include: [
        {
          relation: 'jointAccount',
          scope: {
            where: { jointAccountId: jointAccountId },
            include: [
              {
                relation: 'dongs',
                scope: {
                  where: { userId: this.userId },
                  include: [
                    { relation: 'billList' },
                    { relation: 'payerList' },
                    { relation: 'category' },
                  ],
                },
              },
            ],
          },
        },
      ],
    });

    if (JAS) return JAS.jointAccount.dongs;
    else throw new HttpErrors.UnprocessableEntity('JointAccountId is not valid');
  }
}
