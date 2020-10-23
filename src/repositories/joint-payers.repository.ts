import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import {
  JointPayers,
  JointPayersRelations,
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

export class JointPayersRepository extends DefaultCrudRepository<
  JointPayers,
  typeof JointPayers.prototype.jointBillId,
  JointPayersRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof JointPayers.prototype.jointBillId>;

  public readonly jointAccount: BelongsToAccessor<
    JointAccounts,
    typeof JointPayers.prototype.jointBillId
  >;

  public readonly category: BelongsToAccessor<Categories, typeof JointPayers.prototype.jointBillId>;

  public readonly dong: BelongsToAccessor<Dongs, typeof JointPayers.prototype.jointBillId>;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('JointAccountsRepository')
    protected jointAccountsRepositoryGetter: Getter<JointAccountsRepository>,
    @repository.getter('CategoriesRepository')
    protected categoriesRepositoryGetter: Getter<CategoriesRepository>,
    @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super(JointPayers, dataSource);
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
