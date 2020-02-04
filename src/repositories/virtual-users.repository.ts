import {
  DefaultCrudRepository, repository, BelongsToAccessor, DataObject,
} from '@loopback/repository'
import { VirtualUsers, VirtualUsersRelations, Users, } from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject, Getter } from '@loopback/core'
import { UsersRepository } from './users.repository'

export class VirtualUsersRepository extends DefaultCrudRepository<
  VirtualUsers, typeof VirtualUsers.prototype._key, VirtualUsersRelations> {

  public readonly belongsToUser: BelongsToAccessor<
    Users, typeof VirtualUsers.prototype._key>

  constructor (
    @inject( 'datasources.arangodb' ) dataSource: ArangodbDataSource,
    @repository.getter( 'UsersRepository' )
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super( VirtualUsers, dataSource )

    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser', usersRepositoryGetter )

  }


  /**
  * create model like a human being
  */
  public async createHumanKind ( entity: DataObject<VirtualUsers> )
    : Promise<VirtualUsers> {
    const virtualUser = await this.create( entity )
    virtualUser._id = virtualUser._key[ 1 ]
    virtualUser._key = virtualUser._key[ 0 ]
    return virtualUser
  }
}
