import {
  DefaultCrudRepository, repository, BelongsToAccessor,
  HasManyRepositoryFactory, DataObject,
} from '@loopback/repository'
import { VirtualUsers, VirtualUsersRelations, Users, Dongs } from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject, Getter } from '@loopback/core'
import { UsersRepository } from './users.repository'
import { DongsRepository } from './dongs.repository'

export class VirtualUsersRepository extends DefaultCrudRepository<
  VirtualUsers, typeof VirtualUsers.prototype._key, VirtualUsersRelations> {

  public readonly sourceUser: BelongsToAccessor<Users, typeof VirtualUsers.prototype._key>
  public readonly dongs: HasManyRepositoryFactory<Dongs, typeof VirtualUsers.prototype._key>

  constructor (
    @inject( 'datasources.arangodb' ) dataSource: ArangodbDataSource,
    @repository.getter( 'UsersRepository' )
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter( 'DongsRepository' )
    protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super( VirtualUsers, dataSource )

    this.sourceUser = this.createBelongsToAccessorFor( 'sourceUser', usersRepositoryGetter )
    this.dongs = this.createHasManyRepositoryFactoryFor( 'dongs', dongsRepositoryGetter )
  }


  /**
  * create model like a human being
  */
  public async createHumanKind ( entity: DataObject<VirtualUsers> ): Promise<VirtualUsers> {
    const result = await this.create( entity )
    result._id = result._key[ 1 ]
    result._key = result._key[ 0 ]
    return result
  }
}
