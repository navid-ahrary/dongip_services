import {
  DefaultCrudRepository, repository, HasManyRepositoryFactory, DataObject,
} from '@loopback/repository'
import { Users, VirtualUsers, Dongs, Category, UsersRels } from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject, Getter } from '@loopback/core'
import { VirtualUsersRepository } from './virtual-users.repository'
import { DongsRepository } from './dongs.repository'
import { CategoryRepository } from './category.repository'
import { UsersRelsRepository } from './users-rels.repository'

export class UsersRepository extends DefaultCrudRepository<
  Users, typeof Users.prototype._key> {
  public readonly virtualUsers: HasManyRepositoryFactory<
    VirtualUsers, typeof Users.prototype._key>

  public readonly dongs: HasManyRepositoryFactory<
    Dongs, typeof Users.prototype._key>

  public readonly categories: HasManyRepositoryFactory<
    Category, typeof Users.prototype._key>

  public readonly usersRels: HasManyRepositoryFactory<
    UsersRels, typeof Users.prototype._key>

  constructor (
    @inject( 'datasources.arangodb' ) dataSource: ArangodbDataSource,
    @repository.getter( 'VirtualUsersRepository' )
    protected virtualUsersRepositoryGetter: Getter<VirtualUsersRepository>,
    @repository.getter( 'DongsRepository' )
    protected dongsRepositoryGetter: Getter<DongsRepository>,
    @repository.getter( 'CategoryRepository' )
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter( 'UsersRelsRepository' )
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
  ) {
    super( Users, dataSource )

    this.usersRels = this.createHasManyRepositoryFactoryFor(
      'usersRels', usersRelsRepositoryGetter )
    this.registerInclusionResolver( 'usersRels', this.usersRels.inclusionResolver )

    this.categories = this.createHasManyRepositoryFactoryFor(
      'categories', categoryRepositoryGetter )
    this.registerInclusionResolver( 'categories', this.categories.inclusionResolver )

    this.dongs = this.createHasManyRepositoryFactoryFor(
      'dongs', dongsRepositoryGetter )
    this.registerInclusionResolver( 'dongs', this.dongs.inclusionResolver )

    this.virtualUsers = this.createHasManyRepositoryFactoryFor(
      'virtualUsers', virtualUsersRepositoryGetter )
    this.registerInclusionResolver( 'virtualUsers', this.virtualUsers.inclusionResolver )
  }

  /**
  * create model like a human being
  */
  public async createHumanKind ( entity: DataObject<Users> ): Promise<Users> {
    const result = await this.create( entity )
    result._id = result._key[ 1 ]
    result._key = result._key[ 0 ]
    return result
  }

  /**
  * create users rels belong to user like a human being
  */
  public async createHumanKindUsersRels (
    _key: typeof Users.prototype._key,
    entity: DataObject<UsersRels> ): Promise<UsersRels> {
    const result = await this.usersRels( _key ).create( entity )
    result._id = result._key[ 1 ]
    result._key = result._key[ 0 ]
    return result
  }

  /**
  * create virtual user belong to user like a human being
  */
  public async createHumanKindVirtualUsers (
    _key: typeof Users.prototype._key,
    entity: DataObject<VirtualUsers> ): Promise<VirtualUsers> {
    const result = await this.virtualUsers( _key ).create( entity )
    result._id = result._key[ 1 ]
    result._key = result._key[ 0 ]
    return result
  }

  /**
  * create category belong to user like a human being
  */
  public async createHumanKindCategory (
    _key: typeof Users.prototype._key,
    entity: DataObject<Category> ): Promise<Category> {
    const result = await this.categories( _key ).create( entity )
    result._id = result._key[ 1 ]
    result._key = result._key[ 0 ]
    return result
  }

  /**
  * create dongs belong to user like a human being
  */
  public async createHumanKindDongs (
    _key: typeof Users.prototype._key,
    entity: DataObject<Dongs> ): Promise<Dongs> {
    const result = await this.dongs( _key ).create( entity )
    result._id = result._key[ 1 ]
    result._key = result._key[ 0 ]
    return result
  }
}
