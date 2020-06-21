import {
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
  DefaultCrudRepository,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {MysqlDataSource} from '../datasources';
import {
  Dongs,
  DongsRelations,
  Users,
  BillList,
  PayerList,
  Categories,
  Groups,
} from '../models';
import {UsersRepository} from './users.repository';
import {BillListRepository} from './bill-list.repository';
import {PayerListRepository} from './payer-list.repository';
import {CategoriesRepository} from './categories.repository';
import {GroupsRepository} from './groups.repository';

export class DongsRepository extends DefaultCrudRepository<
  Dongs,
  typeof Dongs.prototype.dongId,
  DongsRelations
> {
  public readonly users: BelongsToAccessor<
    Users,
    typeof Dongs.prototype.dongId
  >;

  public readonly billList: HasManyRepositoryFactory<
    BillList,
    typeof Dongs.prototype.dongId
  >;

  public readonly payerList: HasManyRepositoryFactory<
    PayerList,
    typeof Dongs.prototype.dongId
  >;

  public readonly categories: BelongsToAccessor<
    Categories,
    typeof Dongs.prototype.dongId
  >;

  public readonly group: BelongsToAccessor<
    Groups,
    typeof Dongs.prototype.dongId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CategoriesRepository')
    protected categoryRepositoryGetter: Getter<CategoriesRepository>,
    @repository.getter('BillListRepository')
    protected billListRepositoryGetter: Getter<BillListRepository>,
    @repository.getter('PayerListRepository')
    protected payerListRepositoryGetter: Getter<PayerListRepository>,
    @repository.getter('GroupsRepository')
    protected groupsRepositoryGetter: Getter<GroupsRepository>,
  ) {
    super(Dongs, dataSource);
    this.group = this.createBelongsToAccessorFor(
      'group',
      groupsRepositoryGetter,
    );
    this.registerInclusionResolver('group', this.group.inclusionResolver);

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
