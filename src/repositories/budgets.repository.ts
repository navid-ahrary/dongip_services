import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { inject, Getter } from '@loopback/core';
import { Budgets, BudgetsRelations, Users, Categories, UsersRels, JointAccounts } from '../models';
import { MariadbDataSource } from '../datasources';
import {
  JointAccountsRepository,
  UsersRelsRepository,
  CategoriesRepository,
  UsersRepository,
} from '.';

export class BudgetsRepository extends DefaultCrudRepository<
  Budgets,
  typeof Budgets.prototype.budgetId,
  BudgetsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Budgets.prototype.budgetId>;

  public readonly category: BelongsToAccessor<Categories, typeof Budgets.prototype.budgetId>;

  public readonly userRel: BelongsToAccessor<UsersRels, typeof Budgets.prototype.budgetId>;

  public readonly jointAccount: BelongsToAccessor<JointAccounts, typeof Budgets.prototype.budgetId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CategoriesRepository')
    protected categoriesRepositoryGetter: Getter<CategoriesRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
    @repository.getter('JointAccountsRepository')
    protected jointAccountRepositoryGetter: Getter<JointAccountsRepository>,
  ) {
    super(Budgets, dataSource);

    this.jointAccount = this.createBelongsToAccessorFor(
      'jointAccount',
      jointAccountRepositoryGetter,
    );
    this.registerInclusionResolver('jointAccount', this.jointAccount.inclusionResolver);

    this.userRel = this.createBelongsToAccessorFor('userRel', usersRelsRepositoryGetter);
    this.registerInclusionResolver('userRel', this.userRel.inclusionResolver);

    this.category = this.createBelongsToAccessorFor('category', categoriesRepositoryGetter);
    this.registerInclusionResolver('category', this.category.inclusionResolver);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
