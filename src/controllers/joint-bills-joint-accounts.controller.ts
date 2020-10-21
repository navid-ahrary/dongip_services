import {
  repository,
} from '@loopback/repository';
import {
  param,
  get,
  getModelSchemaRef,
} from '@loopback/rest';
import {
  JointBills,
  JointAccounts,
} from '../models';
import {JointBillsRepository} from '../repositories';

export class JointBillsJointAccountsController {
  constructor(
    @repository(JointBillsRepository)
    public jointBillsRepository: JointBillsRepository,
  ) { }

  @get('/joint-bills/{id}/joint-accounts', {
    responses: {
      '200': {
        description: 'JointAccounts belonging to JointBills',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(JointAccounts)},
          },
        },
      },
    },
  })
  async getJointAccounts(
    @param.path.number('id') id: typeof JointBills.prototype.jointBillId,
  ): Promise<JointAccounts> {
    return this.jointBillsRepository.jointAccount(id);
  }
}
