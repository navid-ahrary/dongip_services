import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import {
  JointBills,
  JointBillsRelations,
  Users,
  JointAccounts,
  Categories,
  Dongs,
} from '../models';
import { MysqlDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { UsersRepository } from './users.repository';
import { JointAccountsRepository } from './joint-accounts.repository';
import { CategoriesRepository } from './categories.repository';
import { DongsRepository } from './dongs.repository';

export class JointBillsRepository extends DefaultCrudRepository<
  JointBills,
  typeof JointBills.prototype.jointBillId,
  JointBillsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof JointBills.prototype.jointBillId>;

  public readonly jointAccount: BelongsToAccessor<
    JointAccounts,
    typeof JointBills.prototype.jointBillId
  >;

  public readonly category: BelongsToAccessor<Categories, typeof JointBills.prototype.jointBillId>;

  public readonly dong: BelongsToAccessor<Dongs, typeof JointBills.prototype.jointBillId>;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('JointAccountsRepository')
    protected jointAccountsRepositoryGetter: Getter<JointAccountsRepository>,
    @repository.getter('CategoriesRepository')
    protected categoriesRepositoryGetter: Getter<CategoriesRepository>,
    @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super(JointBills, dataSource);
    this.dong = this.createBelongsToAccessorFor('dong', dongsRepositoryGetter);
    this.registerInclusionResolver('dong', this.dong.inclusionResolver);
    this.category = this.createBelongsToAccessorFor('category', categoriesRepositoryGetter);
    this.registerInclusionResolver('category', this.category.inclusionResolver);
    this.jointAccount = this.createBelongsToAccessorFor(
      'jointAccount',
      jointAccountsRepositoryGetter,
    );
    this.registerInclusionResolver('jointAccount', this.jointAccount.inclusionResolver);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
