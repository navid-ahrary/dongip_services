import {
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
  DefaultTransactionalRepository,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {
  Category,
  CategoryRelations,
  Users,
  VirtualUsers,
  BillList,
  PayerList,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {UsersRepository} from './';
import {BillListRepository} from './bill-list.repository';
import {PayerListRepository} from './payer-list.repository';

export class CategoryRepository extends DefaultTransactionalRepository<
  Category,
  typeof Category.prototype.categoryId,
  CategoryRelations
> {
  public readonly users: BelongsToAccessor<
    Users | VirtualUsers,
    typeof Category.prototype.categoryId
  >;

  public readonly billLists: HasManyRepositoryFactory<
    BillList,
    typeof Category.prototype.categoryId
  >;

  public readonly payerLists: HasManyRepositoryFactory<
    PayerList,
    typeof Category.prototype.categoryId
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
    super(Category, dataSource);

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
