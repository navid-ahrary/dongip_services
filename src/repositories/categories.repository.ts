import { Getter, inject } from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository,
} from '@loopback/repository';
import {
  BillListRepository,
  BudgetsRepository,
  DongsRepository,
  PayerListRepository,
  UsersRepository,
} from '.';
import { MariadbDataSource } from '../datasources';
import {
  BillList,
  Budgets,
  Categories,
  CategoriesRelations,
  Dongs,
  PayerList,
  Users,
} from '../models';

export class CategoriesRepository extends DefaultCrudRepository<
  Categories,
  typeof Categories.prototype.categoryId,
  CategoriesRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Categories.prototype.categoryId>;

  public readonly billLists: HasManyRepositoryFactory<
    BillList,
    typeof Categories.prototype.categoryId
  >;

  public readonly payerLists: HasManyRepositoryFactory<
    PayerList,
    typeof Categories.prototype.categoryId
  >;

  public readonly dongs: HasManyRepositoryFactory<Dongs, typeof Categories.prototype.categoryId>;

  public readonly budgets: HasManyRepositoryFactory<
    Budgets,
    typeof Categories.prototype.categoryId
  >;

  public readonly parentCategroy: BelongsToAccessor<
    Categories,
    typeof Categories.prototype.categoryId
  >;

  public readonly categories: HasManyRepositoryFactory<
    Categories,
    typeof Categories.prototype.categoryId
  >;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('BillListRepository')
    protected billListRepositoryGetter: Getter<BillListRepository>,
    @repository.getter('PayerListRepository')
    protected payerListRepositoryGetter: Getter<PayerListRepository>,
    @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>,
    @repository.getter('BudgetsRepository')
    protected budgetsRepositoryGetter: Getter<BudgetsRepository>,
    @repository.getter('CategoriesRepository')
    protected categoriesRepositoryGetter: Getter<CategoriesRepository>,
  ) {
    super(Categories, dataSource);
    this.categories = this.createHasManyRepositoryFactoryFor(
      'categories',
      categoriesRepositoryGetter,
    );
    this.registerInclusionResolver('categories', this.categories.inclusionResolver);

    this.parentCategroy = this.createBelongsToAccessorFor(
      'parentCategroy',
      categoriesRepositoryGetter,
    );
    this.registerInclusionResolver('parentCategroy', this.parentCategroy.inclusionResolver);

    this.budgets = this.createHasManyRepositoryFactoryFor('budgets', budgetsRepositoryGetter);
    this.registerInclusionResolver('budgets', this.budgets.inclusionResolver);

    this.dongs = this.createHasManyRepositoryFactoryFor('dongs', dongsRepositoryGetter);
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);

    this.payerLists = this.createHasManyRepositoryFactoryFor(
      'payerLists',
      payerListRepositoryGetter,
    );
    this.registerInclusionResolver('payerLists', this.payerLists.inclusionResolver);

    this.billLists = this.createHasManyRepositoryFactoryFor('billLists', billListRepositoryGetter);
    this.registerInclusionResolver('billLists', this.billLists.inclusionResolver);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
