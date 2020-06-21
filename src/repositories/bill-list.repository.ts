import {
  repository,
  BelongsToAccessor,
  DefaultTransactionalRepository,
} from '@loopback/repository';
import {
  Dongs,
  UsersRels,
  BillList,
  BillListRelations,
  Categories,
  Users,
  Groups,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {DongsRepository} from './dongs.repository';
import {UsersRelsRepository} from './users-rels.repository';
import {CategoriesRepository} from './categories.repository';
import {UsersRepository} from './users.repository';
import {GroupsRepository} from './groups.repository';

export class BillListRepository extends DefaultTransactionalRepository<
  BillList,
  typeof BillList.prototype.billListId,
  BillListRelations
> {
  public readonly dongs: BelongsToAccessor<
    Dongs,
    typeof BillList.prototype.billListId
  >;

  public readonly userRels: BelongsToAccessor<
    UsersRels,
    typeof BillList.prototype.billListId
  >;

  public readonly categories: BelongsToAccessor<
    Categories,
    typeof BillList.prototype.billListId
  >;

  public readonly users: BelongsToAccessor<
    Users,
    typeof BillList.prototype.billListId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('DongsRepository')
    protected dongsRepositoryGetter: Getter<DongsRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
    @repository.getter('CategoriesRepository')
    protected categoryRepositoryGetter: Getter<CategoriesRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(BillList, dataSource);

    this.users = this.createBelongsToAccessorFor(
      'users',
      usersRepositoryGetter,
    );
    this.registerInclusionResolver('users', this.users.inclusionResolver);

    this.categories = this.createBelongsToAccessorFor(
      'categories',
      categoryRepositoryGetter,
    );
    this.registerInclusionResolver(
      'categories',
      this.categories.inclusionResolver,
    );

    this.userRels = this.createBelongsToAccessorFor(
      'userRels',
      usersRelsRepositoryGetter,
    );
    this.registerInclusionResolver('userRels', this.userRels.inclusionResolver);

    this.dongs = this.createBelongsToAccessorFor(
      'dongs',
      dongsRepositoryGetter,
    );
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);
  }
}
