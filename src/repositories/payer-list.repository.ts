import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import {
  CategoriesRepository,
  DongsRepository,
  JointAccountsRepository,
  UsersRelsRepository,
  UsersRepository,
} from '.';
import { MariadbDataSource } from '../datasources';
import {
  Categories,
  Dongs,
  JointAccounts,
  PayerList,
  PayerListRelations,
  Users,
  UsersRels,
} from '../models';

export class PayerListRepository extends DefaultCrudRepository<
  PayerList,
  typeof PayerList.prototype.payerListId,
  PayerListRelations
> {
  public readonly dongs: BelongsToAccessor<Dongs, typeof PayerList.prototype.payerListId>;

  public readonly userRel: BelongsToAccessor<UsersRels, typeof PayerList.prototype.payerListId>;

  public readonly categories: BelongsToAccessor<Categories, typeof PayerList.prototype.payerListId>;

  public readonly users: BelongsToAccessor<Users, typeof PayerList.prototype.payerListId>;

  public readonly jointAccount: BelongsToAccessor<
    JointAccounts,
    typeof PayerList.prototype.payerListId
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
    super(PayerList, dataSource);

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

    this.dongs = this.createBelongsToAccessorFor('dongs', dongsRepositoryGetter);
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);
  }
}
