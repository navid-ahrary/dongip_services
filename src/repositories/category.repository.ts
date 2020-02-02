import {
  DefaultCrudRepository, repository, BelongsToAccessor, HasManyRepositoryFactory,
  DataObject
} from '@loopback/repository'
import { Category, CategoryRelations, Users, CategoryBill } from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject, Getter } from '@loopback/core'
import { UsersRepository } from './users.repository'
import { CategoryBillRepository } from './category-bill.repository'

export class CategoryRepository extends DefaultCrudRepository<
  Category, typeof Category.prototype._key, CategoryRelations> {

  public readonly belongsToUser: BelongsToAccessor<
    Users, typeof Category.prototype._key>
  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill, typeof Category.prototype._key>

  constructor (
    @inject( 'datasources.arangodb' ) dataSource: ArangodbDataSource,
    @repository.getter( 'UsersRepository' )
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter( 'CategoryBillRepository' )
    protected categoryBillRepositoryGetter: Getter<CategoryBillRepository>,
  ) {
    super( Category, dataSource )

    this.categoryBills = this.createHasManyRepositoryFactoryFor(
      'categoryBills', categoryBillRepositoryGetter )
    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser', usersRepositoryGetter )
  }

  /**
  * create model like a human being
  */
  public async createHumanKind ( entity: DataObject<Category> ) {
    const result = await this.create( entity )
    result._id = result._key[ 1 ]
    result._key = result._key[ 0 ]
    return result
  }

  /**
 * create category bill like a human being
 */
  public async createHumanKindCategoryBill (
    _key: typeof Category.prototype._key,
    entity: DataObject<Category> ): Promise<CategoryBill> {
    const result = await this.categoryBills( _key ).create( entity )
    result._id = result._key[ 1 ]
    result._key = result._key[ 0 ]
    return result
  }
}
