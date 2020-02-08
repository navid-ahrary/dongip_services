import {
  DefaultCrudRepository, repository, HasManyRepositoryFactory, DataObject,
} from '@loopback/repository'
import {
  Users, VirtualUsers, Dongs, Category, UsersRels, CategoryBill
} from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject, Getter } from '@loopback/core'
import { PasswordHasher } from '../services/hash.password.bcryptjs'
import { VirtualUsersRepository } from './virtual-users.repository'
import { DongsRepository } from './dongs.repository'
import { CategoryRepository } from './category.repository'
import { UsersRelsRepository } from './users-rels.repository'
import { CategoryBillRepository } from './category-bill.repository'
import { PasswordHasherBindings } from '../keys'

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

  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill,
    typeof Users.prototype._key>

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
    @repository.getter( 'CategoryBillRepository' )
    protected categoryBillRepositoryGetter: Getter<CategoryBillRepository>,
    @inject( PasswordHasherBindings.PASSWORD_HASHER )
    public passwordHasher: PasswordHasher,
  ) {
    super( Users, dataSource )
    this.categoryBills = this.createHasManyRepositoryFactoryFor(
      'categoryBills', categoryBillRepositoryGetter )

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
    const user = await this.create( entity )
    user._id = user._key[ 1 ]
    user._key = user._key[ 0 ]
    return user
  }

  /**
  * create users rels belong to user like a human being
  */
  public async createHumanKindUsersRels (
    _key: typeof Users.prototype._key,
    entity: DataObject<UsersRels> ): Promise<UsersRels> {
    const userRel = await this.usersRels( _key ).create( entity )
    userRel._id = userRel._key[ 1 ]
    userRel._key = userRel._key[ 0 ]
    return userRel
  }

  /**
  * create virtual user belong to user like a human being
  */
  public async createHumanKindVirtualUsers (
    _key: typeof Users.prototype._key,
    entity: DataObject<VirtualUsers> ): Promise<VirtualUsers> {
    const virtualUser = await this.virtualUsers( _key ).create( entity )
    virtualUser._id = virtualUser._key[ 1 ]
    virtualUser._key = virtualUser._key[ 0 ]
    return virtualUser
  }

  /**
  * create category belong to user like a human being
  */
  public async createHumanKindCategory (
    _key: typeof Users.prototype._key,
    entity: DataObject<Category> ): Promise<Category> {
    const category = await this.categories( _key ).create( entity )
    category._id = category._key[ 1 ]
    category._key = category._key[ 0 ]
    return category
  }

  /**
 * create category bills belong to user like a human being
 */
  public async createHumanKindCategoryBills (
    _key: typeof Users.prototype._key,
    entity: DataObject<CategoryBill> ): Promise<CategoryBill> {
    const categoryBill = await this.categoryBills( _key ).create( entity )
    categoryBill._id = categoryBill._key[ 1 ]
    categoryBill._key = categoryBill._key[ 0 ]
    return categoryBill
  }

  /**
  * create dongs belong to user like a human being
  */
  public async createHumanKindDongs (
    _key: typeof Users.prototype._key,
    entity: DataObject<Dongs> ): Promise<Dongs> {
    const dong = await this.dongs( _key ).create( entity )
    dong._id = dong._key[ 1 ]
    dong._key = dong._key[ 0 ]
    return dong
  }

  /**
   * generate a random verify code
   */
  // public async generateVerifyCode (
  //   user: Users | null,
  //   key: string,
  //   regToken: string,
  //   osSpec: string,
  // ): Promise<string> {
  //   const verifyCode = Math.floor( Math.random() * 1000000 ).toString()
  //   const hashedPass = await this.passwordHasher.hashPassword( verifyCode )
  //   await this.updateById( user!._key, {
  //     registerationToken: regToken,
  //     password: hashedPass,
  //     osSpec: osSpec
  //   } )
  //   return verifyCode
  // }
}
