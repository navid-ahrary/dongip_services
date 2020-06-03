import {
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
  DefaultTransactionalRepository,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {MysqlDataSource} from '../datasources';
import {
  Dong,
  DongRelations,
  Users,
  BillList,
  PayerList,
  Category,
} from '../models';
import {UsersRepository} from './users.repository';
import {BillListRepository} from './bill-list.repository';
import {PayerListRepository} from './payer-list.repository';
import {CategoryRepository} from './category.repository';

export class DongRepository extends DefaultTransactionalRepository<
  Dong,
  typeof Dong.prototype.dongId,
  DongRelations
> {
  public readonly users: BelongsToAccessor<Users, typeof Dong.prototype.dongId>;

  public readonly billList: HasManyRepositoryFactory<
    BillList,
    typeof Dong.prototype.dongId
  >;

  public readonly payerList: HasManyRepositoryFactory<
    PayerList,
    typeof Dong.prototype.dongId
  >;

  public readonly categories: BelongsToAccessor<
    Category,
    typeof Dong.prototype.dongId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter('BillListRepository')
    protected billListRepositoryGetter: Getter<BillListRepository>,
    @repository.getter('PayerListRepository')
    protected payerListRepositoryGetter: Getter<PayerListRepository>,
  ) {
    super(Dong, dataSource);

    this.categories = this.createBelongsToAccessorFor(
      'categories',
      categoryRepositoryGetter,
    );
    this.registerInclusionResolver(
      'categories',
      this.categories.inclusionResolver,
    );

    this.payerList = this.createHasManyRepositoryFactoryFor(
      'payerList',
      payerListRepositoryGetter,
    );
    this.registerInclusionResolver(
      'payerList',
      this.payerList.inclusionResolver,
    );

    this.billList = this.createHasManyRepositoryFactoryFor(
      'billList',
      billListRepositoryGetter,
    );
    this.registerInclusionResolver('billList', this.billList.inclusionResolver);

    this.users = this.createBelongsToAccessorFor(
      'users',
      usersRepositoryGetter,
    );
    this.registerInclusionResolver('users', this.users.inclusionResolver);
  }
}
