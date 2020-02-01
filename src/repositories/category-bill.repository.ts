import { DefaultCrudRepository, repository, BelongsToAccessor, DataObject } from '@loopback/repository'
import { CategoryBill, CategoryBillRelations, Category, Dongs } from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject, Getter } from '@loopback/core'
import { CategoryRepository } from './category.repository'
import { DongsRepository } from './dongs.repository'

export class CategoryBillRepository extends DefaultCrudRepository<
  CategoryBill,
  typeof CategoryBill.prototype._key,
  CategoryBillRelations
  > {
  public readonly category: BelongsToAccessor<Category, typeof CategoryBill.prototype._key>

  public readonly dongs: BelongsToAccessor<Dongs, typeof CategoryBill.prototype._key>

  constructor (
    @inject( 'datasources.arangodb' ) dataSource: ArangodbDataSource,
    @repository.getter( 'CategoryRepository' )
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter( 'DongsRepository' )
    protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super( CategoryBill, dataSource )
    this.dongs = this.createBelongsToAccessorFor( 'dongs', dongsRepositoryGetter )
    this.registerInclusionResolver( 'dongs', this.dongs.inclusionResolver )
    this.category = this.createBelongsToAccessorFor( 'category', categoryRepositoryGetter )
    this.registerInclusionResolver( 'category', this.category.inclusionResolver )
  }

  /**
  * create model like a human being
  */
  public async createHumanKind ( entity: DataObject<CategoryBill> ) {
    const result = await this.create( entity )
    result._id = result._key[ 1 ]
    result._key = result._key[ 0 ]
    return result
  }
}
