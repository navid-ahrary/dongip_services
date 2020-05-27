import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';
import {PayerList, PayerListRelations, Dong, UsersRels} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {DongRepository} from './dong.repository';
import {UsersRelsRepository} from './users-rels.repository';

export class PayerListRepository extends DefaultCrudRepository<
  PayerList,
  typeof PayerList.prototype.id,
  PayerListRelations
> {
  public readonly dong: BelongsToAccessor<Dong, typeof PayerList.prototype.id>;

  public readonly usersRels: BelongsToAccessor<
    UsersRels,
    typeof PayerList.prototype.id
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('DongRepository')
    protected dongRepositoryGetter: Getter<DongRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
  ) {
    super(PayerList, dataSource);
    this.usersRels = this.createBelongsToAccessorFor(
      'usersRels',
      usersRelsRepositoryGetter,
    );
    this.registerInclusionResolver(
      'usersRels',
      this.usersRels.inclusionResolver,
    );
    this.dong = this.createBelongsToAccessorFor('dong', dongRepositoryGetter);
    this.registerInclusionResolver('dong', this.dong.inclusionResolver);
  }
}
