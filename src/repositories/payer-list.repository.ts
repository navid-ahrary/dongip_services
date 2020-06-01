import {
  repository,
  BelongsToAccessor,
  DefaultTransactionalRepository,
} from '@loopback/repository';
import {
  PayerList,
  PayerListRelations,
  Dong,
  UsersRels,
  Category,
  Users,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {DongRepository} from './dong.repository';
import {UsersRelsRepository} from './users-rels.repository';
import {CategoryRepository} from './category.repository';
import {UsersRepository} from './users.repository';

export class PayerListRepository extends DefaultTransactionalRepository<
  PayerList,
  typeof PayerList.prototype.payerListId,
  PayerListRelations
> {
  public readonly dongs: BelongsToAccessor<
    Dong,
    typeof PayerList.prototype.payerListId
  >;

  public readonly userRels: BelongsToAccessor<
    UsersRels,
    typeof PayerList.prototype.payerListId
  >;

  public readonly categories: BelongsToAccessor<
    Category,
    typeof PayerList.prototype.payerListId
  >;

  public readonly users: BelongsToAccessor<
    Users,
    typeof PayerList.prototype.payerListId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('DongRepository')
    protected dongRepositoryGetter: Getter<DongRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(PayerList, dataSource);

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

    this.dongs = this.createBelongsToAccessorFor('dongs', dongRepositoryGetter);
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);
  }
}
