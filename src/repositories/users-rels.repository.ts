import {
  DefaultCrudRepository, repository, BelongsToAccessor, DataObject
} from '@loopback/repository'
import { UsersRels, UsersRelsRelations, Users } from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject, Getter } from '@loopback/core'
import { UsersRepository } from './users.repository'

export class UsersRelsRepository extends DefaultCrudRepository<
  UsersRels,
  typeof UsersRels.prototype._key,
  UsersRelsRelations
  > {

  public readonly users: BelongsToAccessor<Users, typeof UsersRels.prototype._key>

  constructor (
    @inject( 'datasources.arangodb' ) dataSource: ArangodbDataSource, @repository.getter( 'UsersRepository' ) protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super( UsersRels, dataSource )
    this.users = this.createBelongsToAccessorFor( 'users', usersRepositoryGetter )
    this.registerInclusionResolver( 'users', this.users.inclusionResolver )
  }

  /**
   * create model like a human being
   */
  public async createHumanKind ( entity: DataObject<UsersRels> ) {
    const result = await this.create( entity )
    result._id = result._key[ 1 ]
    result._key = result._key[ 0 ]
    return result
  }
}
