import {
  DefaultCrudRepository, repository, BelongsToAccessor, DataObject
} from '@loopback/repository'
import { CategoryBill, CategoryBillRelations, Category, Dongs, Users} from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject, Getter } from '@loopback/core'
import { CategoryRepository } from './category.repository'
import { DongsRepository } from './dongs.repository'
import {UsersRepository} from './users.repository';

export class CategoryBillRepository extends DefaultCrudRepository<
  CategoryBill, typeof CategoryBill.prototype._key, CategoryBillRelations> {

  public readonly belongsToCategory: BelongsToAccessor<
    Category, typeof CategoryBill.prototype._key>
  public readonly belongsToDong: BelongsToAccessor<
    Dongs, typeof CategoryBill.prototype._key>

  public readonly belongsToUser: BelongsToAccessor<Users, typeof CategoryBill.prototype._key>;

  constructor (
    @inject( 'datasources.arangodb' ) dataSource: ArangodbDataSource,
    @repository.getter( 'CategoryRepository' )
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter( 'DongsRepository' )
    protected dongsRepositoryGetter: Getter<DongsRepository>, @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super( CategoryBill, dataSource )
    this.belongsToUser = this.createBelongsToAccessorFor('belongsToUser', usersRepositoryGetter,);
    this.belongsToDong = this.createBelongsToAccessorFor(
      'belongsToDong', dongsRepositoryGetter )
    this.belongsToCategory = this.createBelongsToAccessorFor(
      'belongsToCategory', categoryRepositoryGetter )
  }

  /**
  * create model like a human being
  */
  public async createHumanKind ( entity: DataObject<CategoryBill> )
    : Promise<CategoryBill> {
    const categoryBill = await this.create( entity )
    categoryBill._id = categoryBill._key[ 1 ]
    categoryBill._key = categoryBill._key[ 0 ]
    return categoryBill
  }
}
