import {DefaultCrudRepository, repository, BelongsToAccessor, HasManyRepositoryFactory} from '@loopback/repository';
import {Category, CategoryRelations, Users, CategoryBill} from '../models';
import {MongoDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';
import {CategoryBillRepository} from './category-bill.repository';

export class CategoryRepository extends DefaultCrudRepository<
  Category,
  typeof Category.prototype.id,
  CategoryRelations
> {
  public readonly users: BelongsToAccessor<Users, typeof Category.prototype.id>;

  public readonly categoryBills: HasManyRepositoryFactory<CategoryBill, typeof Category.prototype.id>;

  constructor(
    @inject('datasources.mongods') dataSource: MongoDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>, @repository.getter('CategoryBillRepository') protected categoryBillRepositoryGetter: Getter<CategoryBillRepository>,
  ) {
    super(Category, dataSource);
    this.categoryBills = this.createHasManyRepositoryFactoryFor('categoryBills', categoryBillRepositoryGetter,);
    this.registerInclusionResolver('categoryBills', this.categoryBills.inclusionResolver);
    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
    this.registerInclusionResolver('users', this.users.inclusionResolver);
  }
}
