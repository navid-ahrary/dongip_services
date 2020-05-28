import {
  repository,
  HasManyRepositoryFactory,
  DefaultTransactionalRepository,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {MysqlDataSource} from '../datasources';
import {PasswordHasher} from '../services';
import {
  VirtualUsersRepository,
  DongRepository,
  CategoryBillRepository,
  CategoryRepository,
  UsersRelsRepository,
} from './';
import {PasswordHasherBindings} from '../keys';
import {
  Users,
  VirtualUsers,
  Dong,
  Category,
  UsersRels,
  CategoryBill, BillList, PayerList} from '../models';
import {BillListRepository} from './bill-list.repository';
import {PayerListRepository} from './payer-list.repository';

export class UsersRepository extends DefaultTransactionalRepository<
  Users,
  typeof Users.prototype.id
> {
  public readonly virtualUsers: HasManyRepositoryFactory<
    VirtualUsers,
    typeof Users.prototype.id
  >;

  public readonly dong: HasManyRepositoryFactory<
    Dong,
    typeof Users.prototype.id
  >;

  public readonly categories: HasManyRepositoryFactory<
    Category,
    typeof Users.prototype.id
  >;

  public readonly usersRels: HasManyRepositoryFactory<
    UsersRels,
    typeof Users.prototype.id
  >;

  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill,
    typeof Users.prototype.id
  >;

  public readonly billList: HasManyRepositoryFactory<BillList, typeof Users.prototype.id>;

  public readonly payerList: HasManyRepositoryFactory<PayerList, typeof Users.prototype.id>;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('VirtualUsersRepository')
    protected virtualUsersRepositoryGetter: Getter<VirtualUsersRepository>,
    @repository.getter('DongRepository')
    protected dongRepositoryGetter: Getter<DongRepository>,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
    @repository.getter('CategoryBillRepository')
    protected categoryBillRepositoryGetter: Getter<CategoryBillRepository>,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher, @repository.getter('BillListRepository') protected billListRepositoryGetter: Getter<BillListRepository>, @repository.getter('PayerListRepository') protected payerListRepositoryGetter: Getter<PayerListRepository>,
  ) {
    super(Users, dataSource);
    this.payerList = this.createHasManyRepositoryFactoryFor('payerList', payerListRepositoryGetter,);
    this.registerInclusionResolver('payerList', this.payerList.inclusionResolver);
    this.billList = this.createHasManyRepositoryFactoryFor('billList', billListRepositoryGetter,);
    this.registerInclusionResolver('billList', this.billList.inclusionResolver);
    this.categoryBills = this.createHasManyRepositoryFactoryFor(
      'categoryBills',
      categoryBillRepositoryGetter,
    );
    this.registerInclusionResolver(
      'categoryBills',
      this.categoryBills.inclusionResolver,
    );

    this.usersRels = this.createHasManyRepositoryFactoryFor(
      'usersRels',
      usersRelsRepositoryGetter,
    );
    this.registerInclusionResolver(
      'usersRels',
      this.usersRels.inclusionResolver,
    );

    this.categories = this.createHasManyRepositoryFactoryFor(
      'categories',
      categoryRepositoryGetter,
    );
    this.registerInclusionResolver(
      'categories',
      this.categories.inclusionResolver,
    );

    this.dong = this.createHasManyRepositoryFactoryFor(
      'dong',
      dongRepositoryGetter,
    );
    this.registerInclusionResolver('dong', this.dong.inclusionResolver);

    this.virtualUsers = this.createHasManyRepositoryFactoryFor(
      'virtualUsers',
      virtualUsersRepositoryGetter,
    );
    this.registerInclusionResolver(
      'virtualUsers',
      this.virtualUsers.inclusionResolver,
    );
  }
}
