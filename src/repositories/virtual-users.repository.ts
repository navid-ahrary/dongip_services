import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  DataObject,
  HasManyRepositoryFactory,
} from '@loopback/repository'
import { inject, Getter } from '@loopback/core'

import {
  VirtualUsers,
  VirtualUsersRelations,
  Users,
  UsersRels,
  Dongs,
  Category,
  CategoryBill,
} from '../models'
import { ArangodbDataSource } from '../datasources'
import {
  UsersRepository,
  UsersRelsRepository,
  DongsRepository,
  CategoryBillRepository,
  CategoryRepository
} from './'


export class VirtualUsersRepository extends DefaultCrudRepository<
  VirtualUsers, typeof VirtualUsers.prototype._key, VirtualUsersRelations> {

  public readonly belongsToUser: BelongsToAccessor<
    Users, typeof VirtualUsers.prototype._id>

  public readonly usersRels: HasManyRepositoryFactory<
    UsersRels, typeof Users.prototype._id>

  public readonly dongs: HasManyRepositoryFactory<
    Dongs, typeof Users.prototype._id>

  public readonly categories: HasManyRepositoryFactory<
    Category, typeof Users.prototype._id>

  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill, typeof Users.prototype._id>

  constructor (
    @inject( 'datasources.arangodb' ) dataSource: ArangodbDataSource,
    @repository.getter( 'UsersRepository' )
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter( 'DongsRepository' )
    protected dongsRepositoryGetter: Getter<DongsRepository>,
    @repository.getter( 'CategoryRepository' )
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter( 'UsersRelsRepository' )
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
    @repository.getter( 'CategoryBillRepository' )
    protected categoryBillRepositoryGetter: Getter<CategoryBillRepository>,
  ) {
    super( VirtualUsers, dataSource )

    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser', usersRepositoryGetter
    )

    this.categories = this.createHasManyRepositoryFactoryFor(
      'categories', categoryRepositoryGetter
    )
    this.registerInclusionResolver(
      'categories', this.categories.inclusionResolver
    )

    this.usersRels = this.createHasManyRepositoryFactoryFor(
      'usersRels', usersRelsRepositoryGetter
    )
    this.registerInclusionResolver(
      'usersRels', this.usersRels.inclusionResolver
    )
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

  /**
  * create users rels belong to virtual user like a human being
  */
  public async createHumanKindUsersRels (
    virtualUserId: typeof Users.prototype._id,
    entity: DataObject<UsersRels> ): Promise<UsersRels> {
    const userRel = await this.usersRels( virtualUserId ).create( entity )
    userRel._id = userRel._key[ 1 ]
    userRel._key = userRel._key[ 0 ]
    return userRel
  }

  /**
 * create category belong to user like a human being
 */
  public async createHumanKindCategory (
    virtualUserId: typeof VirtualUsers.prototype._id,
    entity: DataObject<Category> ): Promise<Category> {
    const category = await this.categories( virtualUserId ).create( entity )
    category._id = category._key[ 1 ]
    category._key = category._key[ 0 ]
    return category
  }
}
