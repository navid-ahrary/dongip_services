import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { authorize } from '@loopback/authorization';
import { inject } from '@loopback/core';
import { DataObject, repository } from '@loopback/repository';
import { get, getModelSchemaRef, HttpErrors, param } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import _ from 'lodash';
import { ResponseDongsDto } from '.';
import { LocMsgsBindings } from '../keys';
import { Users } from '../models';
import { JointAccountsRepository, JointAccountSubscribesRepository } from '../repositories';
import { basicAuthorization, CurrentUserProfile } from '../services';
import { LocalizedMessages } from '../types';

@authenticate('jwt.access')
@authorize({ allowedRoles: ['GOLD'], voters: [basicAuthorization] })
export class JointAccountsDongsController {
  private readonly userId: typeof Users.prototype.userId;

  constructor(
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
    @repository(JointAccountSubscribesRepository)
    public jointAccSubRepo: JointAccountSubscribesRepository,
    @repository(JointAccountsRepository) public jointAccountsRepository: JointAccountsRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
  }

  @get('/joint-accounts/{jointAccountId}/dongs', {
    summary: 'Get Dongs belongs to JointAccount by jointAccountId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of JointAccounts has many Dongs',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(ResponseDongsDto) },
          },
        },
      },
    },
  })
  async findDongsBelongsToJointAccount(
    @param.path.number('jointAccountId') jointAccountId: number,
  ) {
    const JAS = await this.jointAccSubRepo.findOne({
      where: { userId: this.userId, jointAccountId: jointAccountId, deleted: false },
      include: [
        {
          relation: 'jointAccount',
          scope: {
            where: { jointAccountId: jointAccountId, deleted: false },
            include: [
              {
                relation: 'dongs',
                scope: {
                  where: { userId: this.userId },
                  include: [
                    { relation: 'billList' },
                    { relation: 'payerList' },
                    { relation: 'category' },
                    { relation: 'receipt' },
                  ],
                },
              },
            ],
          },
        },
      ],
    });

    const result: DataObject<ResponseDongsDto>[] = [];

    if (JAS) {
      _.forEach(JAS.jointAccount.dongs, d => {
        const r = {
          ..._.omit(d, 'receipt'),
          receiptId: d.receipt?.receiptId,
        };

        result.push(r);
      });

      return result;
    } else throw new HttpErrors.UnprocessableEntity('JointAccountId is not valid');
  }
}
