import { Getter, inject } from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository,
} from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import {
  Accounts,
  AccountsRelations,
  Budgets,
  Categories,
  Dongs,
  JointAccounts,
  Messages,
  Users,
} from '../models';
import { BudgetsRepository } from './budgets.repository';
import { CategoriesRepository } from './categories.repository';
import { DongsRepository } from './dongs.repository';
import { JointAccountsRepository } from './joint-accounts.repository';
import { MessagesRepository } from './messages.repository';
import { UsersRepository } from './users.repository';

export class AccountsRepository extends DefaultCrudRepository<
  Accounts,
  typeof Accounts.prototype.accountId,
  AccountsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Accounts.prototype.accountId>;

  public readonly dongs: HasManyRepositoryFactory<Dongs, typeof Accounts.prototype.accountId>;

  public readonly budgets: HasManyRepositoryFactory<Budgets, typeof Accounts.prototype.accountId>;

  public readonly categories: HasManyRepositoryFactory<
    Categories,
    typeof Accounts.prototype.accountId
  >;

  public readonly jointAccounts: HasManyRepositoryFactory<
    JointAccounts,
    typeof Accounts.prototype.accountId
  >;

  public readonly messages: HasManyRepositoryFactory<Messages, typeof Accounts.prototype.accountId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>,
    @repository.getter('BudgetsRepository')
    protected budgetsRepositoryGetter: Getter<BudgetsRepository>,
    @repository.getter('CategoriesRepository')
    protected categoriesRepositoryGetter: Getter<CategoriesRepository>,
    @repository.getter('JointAccountsRepository')
    protected jointAccountsRepositoryGetter: Getter<JointAccountsRepository>,
    @repository.getter('MessagesRepository')
    protected messagesRepositoryGetter: Getter<MessagesRepository>,
  ) {
    super(Accounts, dataSource);
    this.messages = this.createHasManyRepositoryFactoryFor('messages', messagesRepositoryGetter);
    this.registerInclusionResolver('messages', this.messages.inclusionResolver);
    this.jointAccounts = this.createHasManyRepositoryFactoryFor(
      'jointAccounts',
      jointAccountsRepositoryGetter,
    );
    this.registerInclusionResolver('jointAccounts', this.jointAccounts.inclusionResolver);
    this.categories = this.createHasManyRepositoryFactoryFor(
      'categories',
      categoriesRepositoryGetter,
    );
    this.registerInclusionResolver('categories', this.categories.inclusionResolver);
    this.budgets = this.createHasManyRepositoryFactoryFor('budgets', budgetsRepositoryGetter);
    this.registerInclusionResolver('budgets', this.budgets.inclusionResolver);
    this.dongs = this.createHasManyRepositoryFactoryFor('dongs', dongsRepositoryGetter);
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
  }
}
