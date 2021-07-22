import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import {
  BillList,
  BillListRelations,
  Categories,
  Dongs,
  JointAccounts,
  Users,
  UsersRels,
} from '../models';
import { CategoriesRepository } from './categories.repository';
import { DongsRepository } from './dongs.repository';
import { JointAccountsRepository } from './joint-accounts.repository';
import { UsersRelsRepository } from './users-rels.repository';
import { UsersRepository } from './users.repository';

export class BillListRepository extends DefaultCrudRepository<
  BillList,
  typeof BillList.prototype.billListId,
  BillListRelations
> {
  public readonly dong: BelongsToAccessor<Dongs, typeof BillList.prototype.billListId>;

  public readonly userRel: BelongsToAccessor<UsersRels, typeof BillList.prototype.billListId>;

  public readonly categories: BelongsToAccessor<Categories, typeof BillList.prototype.billListId>;

  public readonly users: BelongsToAccessor<Users, typeof BillList.prototype.billListId>;

  public readonly jointAccount: BelongsToAccessor<
    JointAccounts,
    typeof BillList.prototype.billListId
  >;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
    @repository.getter('CategoriesRepository')
    protected categoryRepositoryGetter: Getter<CategoriesRepository>,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('JointAccountsRepository')
    protected jointAccountsRepositoryGetter: Getter<JointAccountsRepository>,
  ) {
    super(BillList, dataSource);

    this.jointAccount = this.createBelongsToAccessorFor(
      'jointAccount',
      jointAccountsRepositoryGetter,
    );
    this.registerInclusionResolver('jointAccount', this.jointAccount.inclusionResolver);

    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
    this.registerInclusionResolver('users', this.users.inclusionResolver);

    this.categories = this.createBelongsToAccessorFor('categories', categoryRepositoryGetter);
    this.registerInclusionResolver('categories', this.categories.inclusionResolver);

    this.userRel = this.createBelongsToAccessorFor('userRel', usersRelsRepositoryGetter);
    this.registerInclusionResolver('userRel', this.userRel.inclusionResolver);

    this.dong = this.createBelongsToAccessorFor('dong', dongsRepositoryGetter);
    this.registerInclusionResolver('dong', this.dong.inclusionResolver);
  }
}
