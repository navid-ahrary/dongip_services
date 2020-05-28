import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';
import {Dong, UsersRels, BillList, BillListRelations, Category} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {DongRepository} from './dong.repository';
import {UsersRelsRepository} from './users-rels.repository';
import {CategoryRepository} from './category.repository';

export class BillListRepository extends DefaultCrudRepository<
  BillList,
  typeof BillList.prototype.id,
  BillListRelations
> {
  public readonly dong: BelongsToAccessor<Dong, typeof BillList.prototype.id>;

  public readonly usersRels: BelongsToAccessor<
    UsersRels,
    typeof BillList.prototype.id
  >;

  public readonly category: BelongsToAccessor<Category, typeof BillList.prototype.id>;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('DongRepository')
    protected dongRepositoryGetter: Getter<DongRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>, @repository.getter('CategoryRepository') protected categoryRepositoryGetter: Getter<CategoryRepository>,
  ) {
    super(BillList, dataSource);
    this.category = this.createBelongsToAccessorFor('category', categoryRepositoryGetter,);
    this.registerInclusionResolver('category', this.category.inclusionResolver);
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
