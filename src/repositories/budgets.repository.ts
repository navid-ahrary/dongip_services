import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';
import {
  Budgets,
  BudgetsRelations,
  Users,
  Categories,
  UsersRels,
  Groups,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';
import {CategoriesRepository} from './categories.repository';
import {UsersRelsRepository} from './users-rels.repository';
import {GroupsRepository} from './groups.repository';

export class BudgetsRepository extends DefaultCrudRepository<
  Budgets,
  typeof Budgets.prototype.budgetId,
  BudgetsRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof Budgets.prototype.budgetId
  >;

  public readonly category: BelongsToAccessor<
    Categories,
    typeof Budgets.prototype.budgetId
  >;

  public readonly userRel: BelongsToAccessor<
    UsersRels,
    typeof Budgets.prototype.budgetId
  >;

  public readonly group: BelongsToAccessor<
    Groups,
    typeof Budgets.prototype.budgetId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CategoriesRepository')
    protected categoriesRepositoryGetter: Getter<CategoriesRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
    @repository.getter('GroupsRepository')
    protected groupsRepositoryGetter: Getter<GroupsRepository>,
  ) {
    super(Budgets, dataSource);

    this.group = this.createBelongsToAccessorFor(
      'group',
      groupsRepositoryGetter,
    );
    this.registerInclusionResolver('group', this.group.inclusionResolver);

    this.userRel = this.createBelongsToAccessorFor(
      'userRel',
      usersRelsRepositoryGetter,
    );
    this.registerInclusionResolver('userRel', this.userRel.inclusionResolver);

    this.category = this.createBelongsToAccessorFor(
      'category',
      categoriesRepositoryGetter,
    );
    this.registerInclusionResolver('category', this.category.inclusionResolver);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
