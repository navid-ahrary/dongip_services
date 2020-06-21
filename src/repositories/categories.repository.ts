import {
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
  DefaultCrudRepository,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {
  Categories,
  CategoriesRelations,
  Users,
  BillList,
  PayerList,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {UsersRepository} from './';
import {BillListRepository} from './bill-list.repository';
import {PayerListRepository} from './payer-list.repository';

export class CategoriesRepository extends DefaultCrudRepository<
  Categories,
  typeof Categories.prototype.categoryId,
  CategoriesRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof Categories.prototype.categoryId
  >;

  public readonly billLists: HasManyRepositoryFactory<
    BillList,
    typeof Categories.prototype.categoryId
  >;

  public readonly payerLists: HasManyRepositoryFactory<
    PayerList,
    typeof Categories.prototype.categoryId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('BillListRepository')
    protected billListRepositoryGetter: Getter<BillListRepository>,
    @repository.getter('PayerListRepository')
    protected payerListRepositoryGetter: Getter<PayerListRepository>,
  ) {
    super(Categories, dataSource);

    this.payerLists = this.createHasManyRepositoryFactoryFor(
      'payerLists',
      payerListRepositoryGetter,
    );
    this.registerInclusionResolver(
      'payerLists',
      this.payerLists.inclusionResolver,
    );

    this.billLists = this.createHasManyRepositoryFactoryFor(
      'billLists',
      billListRepositoryGetter,
    );
    this.registerInclusionResolver(
      'billLists',
      this.billLists.inclusionResolver,
    );

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
