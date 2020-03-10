import {repository, } from '@loopback/repository';
import {param, get, getModelSchemaRef, } from '@loopback/rest';
import {authenticate} from '@loopback/authentication';

import {CategoryBill, UsersRels, } from '../models';
import {CategoryBillRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

export class CategoryBillUsersRelsController {
  constructor (
    @repository(CategoryBillRepository)
    public categoryBillRepository: CategoryBillRepository,
  ) {}

  @get('/api/category-bills/{_billKey}/users-rels', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'UsersRels belonging to CategoryBill',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(UsersRels)},
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async getUsersRels (
    @param.path.string('_billKey')
    _billKey: typeof CategoryBill.prototype._key, ): Promise<UsersRels> {
    const billId = 'CategoryBill/' + _billKey;
    return this.categoryBillRepository.belongsToUserRels(billId);
  }
}
