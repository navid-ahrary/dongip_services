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
  Users,
} from '../models';
import {JointBillsRepository} from '../repositories';

export class JointBillsUsersController {
  constructor(
    @repository(JointBillsRepository)
    public jointBillsRepository: JointBillsRepository,
  ) { }

  @get('/joint-bills/{id}/users', {
    responses: {
      '200': {
        description: 'Users belonging to JointBills',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Users)},
          },
        },
      },
    },
  })
  async getUsers(
    @param.path.number('id') id: typeof JointBills.prototype.jointBillId,
  ): Promise<Users> {
    return this.jointBillsRepository.user(id);
  }
}
