import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {Budgets, BudgetsRelations, Users, Categories} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';
import {CategoriesRepository} from './categories.repository';

export class BudgetsRepository extends DefaultCrudRepository<
  Budgets,
  typeof Budgets.prototype.budgetId,
  BudgetsRelations
> {

  public readonly user: BelongsToAccessor<Users, typeof Budgets.prototype.budgetId>;

  public readonly category: BelongsToAccessor<Categories, typeof Budgets.prototype.budgetId>;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource, @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>, @repository.getter('CategoriesRepository') protected categoriesRepositoryGetter: Getter<CategoriesRepository>,
  ) {
    super(Budgets, dataSource);
    this.category = this.createBelongsToAccessorFor('category', categoriesRepositoryGetter,);
    this.registerInclusionResolver('category', this.category.inclusionResolver);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter,);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
