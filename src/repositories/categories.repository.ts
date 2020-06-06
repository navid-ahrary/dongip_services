import {
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
  DefaultTransactionalRepository,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {
  Categories,
  CategoriesRelations,
  Users,
  VirtualUsers,
  BillList,
  PayerList,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {UsersRepository} from './';
import {BillListRepository} from './bill-list.repository';
import {PayerListRepository} from './payer-list.repository';

export class CategoriesRepository extends DefaultTransactionalRepository<
  Categories,
  typeof Categories.prototype.categoryId,
  CategoriesRelations
> {
  public readonly users: BelongsToAccessor<
    Users | VirtualUsers,
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

    this.users = this.createBelongsToAccessorFor(
      'users',
      usersRepositoryGetter,
    );
    this.registerInclusionResolver('users', this.users.inclusionResolver);
  }
}
