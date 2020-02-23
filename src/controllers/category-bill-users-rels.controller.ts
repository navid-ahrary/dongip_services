import { repository, } from '@loopback/repository'
import { param, get, getModelSchemaRef, } from '@loopback/rest'

import { CategoryBill, UsersRels, } from '../models'
import { CategoryBillRepository } from '../repositories'

export class CategoryBillUsersRelsController {
  constructor (
    @repository( CategoryBillRepository )
    public categoryBillRepository: CategoryBillRepository,
  ) { }

  @get( '/category-bills/{id}/users-rels', {
    responses: {
      '200': {
        description: 'UsersRels belonging to CategoryBill',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef( UsersRels ) },
          },
        },
      },
    },
  } )
  async getUsersRels (
    @param.path.string( 'id' ) id: typeof CategoryBill.prototype._key,
  ): Promise<UsersRels> {
    return this.categoryBillRepository.belongsToUserRels( id )
  }
}
