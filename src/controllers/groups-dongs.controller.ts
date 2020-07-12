import {Count, CountSchema, repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  api,
  HttpErrors,
} from '@loopback/rest';
import {authenticate} from '@loopback/authentication';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {inject, intercept} from '@loopback/core';
import {Groups, Dongs} from '../models';
import {
  GroupsRepository,
  DongsRepository,
  PayerListRepository,
  BillListRepository,
} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {ValidateGroupIdInterceptor} from '../interceptors/validate-group-id.interceptor';

@intercept(ValidateGroupIdInterceptor.BINDING_KEY)
@api({basePath: '/api/groups', paths: {}})
@authenticate('jwt.access')
export class GroupsDongsController {
  userId: number;

  constructor(
    @repository(GroupsRepository) protected groupsRepository: GroupsRepository,
    @repository(DongsRepository) protected dongRepository: DongsRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
    @repository(PayerListRepository)
    public payerListRepository: PayerListRepository,
    @repository(BillListRepository)
    public billListRepository: BillListRepository,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

  @get('/{groupId}/dongs', {
    summary: 'GET all Dongs [include PayerList, BillList] belongs to groupId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Groups has many Dongs',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Dongs)},
          },
        },
      },
    },
  })
  async findGroupsDongsByGroupId(
    @param.path.number('groupId', {required: true})
    groupId: typeof Groups.prototype.groupId,
  ): Promise<Dongs[]> {
    return this.groupsRepository.dongs(groupId).find({
      where: {userId: this.userId, groupId: groupId},
      include: [{relation: 'billList'}, {relation: 'payerList'}],
    });
  }

  @del('/{groupId}/dongs', {
    summary: 'DELETE Dongs [include Payerlist, BillList] belongs to groupId',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Groups.Dongs DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async deleteGroupsByIdAllDongs(
    @param.path.number('groupId', {required: true})
    groupId: typeof Groups.prototype.groupId,
  ): Promise<Count> {
    // Delete Dongs
    return this.groupsRepository
      .dongs(groupId)
      .delete({userId: this.userId, groupId: groupId});
  }
}
