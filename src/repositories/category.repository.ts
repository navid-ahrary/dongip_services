import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
  DataObject,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {
  Category,
  CategoryRelations,
  Users,
  CategoryBill,
  VirtualUsers,
} from '../models';
import {ArangodbDataSource} from '../datasources';
import {UsersRepository, CategoryBillRepository} from './';

export class CategoryRepository extends DefaultCrudRepository<
  Category,
  typeof Category.prototype._key,
  CategoryRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users | VirtualUsers,
    typeof Category.prototype._id
  >;

  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill,
    typeof Category.prototype._id
  >;

  constructor(
    @inject('datasources.arangodb') dataSource: ArangodbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CategoryBillRepository')
    protected categoryBillRepositoryGetter: Getter<CategoryBillRepository>,
  ) {
    super(Category, dataSource);

    this.categoryBills = this.createHasManyRepositoryFactoryFor(
      'categoryBills',
      categoryBillRepositoryGetter,
    );
    // this.registerInclusionResolver(
    //   'categoryBills', this.categoryBills.inclusionResolver
    // )

    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser',
      usersRepositoryGetter,
    );
  }

  /**
   * override super class's create method
   */
  public async create(entity: DataObject<Category>): Promise<Category> {
    const category = await this.create(entity);
    category._id = category._key[1];
    category._key = category._key[0];
    return category;
  }

  /**
   * create category bill like a human being
   */
  public async createHumanKindCategoryBill(
    categoryId: typeof Category.prototype._id,
    entity: DataObject<Category>,
  ): Promise<CategoryBill> {
    const categoryBill = await this.categoryBills(categoryId).create(entity);
    categoryBill._id = categoryBill._key[1];
    categoryBill._key = categoryBill._key[0];
    return categoryBill;
  }
}
