import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  DataObject,
} from '@loopback/repository';
import {
  CategoryBill,
  CategoryBillRelations,
  Category,
  Dongs,
  Users,
  UsersRels,
} from '../models';
import {ArangodbDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {CategoryRepository} from './category.repository';
import {DongsRepository} from './dongs.repository';
import {UsersRepository} from './users.repository';
import {UsersRelsRepository} from './users-rels.repository';

export class CategoryBillRepository extends DefaultCrudRepository<
  CategoryBill,
  typeof CategoryBill.prototype._key,
  CategoryBillRelations
> {
  public readonly belongsToCategory: BelongsToAccessor<
    Category,
    typeof CategoryBill.prototype._id
  >;

  public readonly belongsToDong: BelongsToAccessor<
    Dongs,
    typeof CategoryBill.prototype._key
  >;

  public readonly belongsToUser: BelongsToAccessor<
    Users,
    typeof CategoryBill.prototype._key
  >;

  public readonly belongsToUserRels: BelongsToAccessor<
    UsersRels,
    typeof CategoryBill.prototype._id
  >;

  constructor(
    @inject('datasources.arangodb') dataSource: ArangodbDataSource,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter('DongsRepository')
    protected dongsRepositoryGetter: Getter<DongsRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
  ) {
    super(CategoryBill, dataSource);
    this.belongsToUserRels = this.createBelongsToAccessorFor(
      'belongsToUserRels',
      usersRelsRepositoryGetter,
    );
    this.registerInclusionResolver(
      'belongsToUserRels',
      this.belongsToUserRels.inclusionResolver,
    );

    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser',
      usersRepositoryGetter,
    );

    this.belongsToDong = this.createBelongsToAccessorFor(
      'belongsToDong',
      dongsRepositoryGetter,
    );

    this.belongsToCategory = this.createBelongsToAccessorFor(
      'belongsToCategory',
      categoryRepositoryGetter,
    );
  }

  /**
   * override super class's create method
   */
  public async create(entity: DataObject<CategoryBill>): Promise<CategoryBill> {
    const categoryBill = await super.create(entity);
    categoryBill._id = categoryBill._key[1];
    categoryBill._key = categoryBill._key[0];
    return categoryBill;
  }
}
