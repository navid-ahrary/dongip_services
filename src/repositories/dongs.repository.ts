import {
  DefaultCrudRepository, repository, BelongsToAccessor,
  DataObject
} from '@loopback/repository'
import { Dongs, DongsRelations, Users, Category } from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject, Getter } from '@loopback/core'
import { UsersRepository } from './users.repository'
import { CategoryRepository } from './category.repository'

export class DongsRepository extends DefaultCrudRepository<
  Dongs, typeof Dongs.prototype._key, DongsRelations> {

  public readonly belongsToUser: BelongsToAccessor<
    Users, typeof Dongs.prototype._key>
  public readonly belongsToCategory: BelongsToAccessor<
    Category, typeof Dongs.prototype._key>

  constructor (
    @inject( 'datasources.arangodb' ) dataSource: ArangodbDataSource,
    @repository.getter( 'UsersRepository' )
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter( 'CategoryRepository' )
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
  ) {
    super( Dongs, dataSource )

    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser', usersRepositoryGetter )
    this.belongsToCategory = this.createBelongsToAccessorFor(
      'belongsToCategory', categoryRepositoryGetter )
  }

  /**
  * create model like a human being
  */
  public async createHumanKind ( entity: DataObject<Dongs> ): Promise<Dongs> {
    const result = await this.create( entity )
    result._id = result._key[ 1 ]
    result._key = result._key[ 0 ]
    return result
  }
}
