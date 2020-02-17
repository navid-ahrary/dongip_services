import {
  DefaultCrudRepository, repository, BelongsToAccessor,
  DataObject
} from '@loopback/repository'
import { Dongs, DongsRelations, Users, Category } from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject, Getter } from '@loopback/core'
import { UsersRepository } from './users.repository'
import { CategoryRepository } from './category.repository'
import { HttpErrors } from '@loopback/rest'

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
    try {
      const dong = await this.create( entity )
      dong._id = dong._key[ 1 ]
      dong._key = dong._key[ 0 ]
      return dong
    } catch ( _err ) {
      console.log( _err )
      if ( _err.code === 409 ) {
        throw new HttpErrors.Conflict( _err.response.body.errorMessage )
      } else {
        throw new HttpErrors.NotAcceptable( _err )
      }
    }
  }
}
