import { inject, Getter } from '@loopback/core';
import { repository, BelongsToAccessor, DefaultCrudRepository } from '@loopback/repository';
import {
  Dongs,
  UsersRels,
  BillList,
  BillListRelations,
  Categories,
  Users,
  JointAccounts,
} from '../models';
import { MariadbDataSource } from '../datasources';
import {
  JointAccountsRepository,
  UsersRepository,
  CategoriesRepository,
  UsersRelsRepository,
  DongsRepository,
} from '.';

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
