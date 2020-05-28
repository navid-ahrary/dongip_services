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
  CategoryBill,
  VirtualUsers,
  BillList,
  PayerList,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {UsersRepository, CategoryBillRepository} from './';
import {BillListRepository} from './bill-list.repository';
import {PayerListRepository} from './payer-list.repository';

export class CategoryRepository extends DefaultTransactionalRepository<
  Category,
  typeof Category.prototype.id,
  CategoryRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users | VirtualUsers,
    typeof Category.prototype.id
  >;

  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill,
    typeof Category.prototype.id
  >;

  public readonly billList: HasManyRepositoryFactory<
    BillList,
    typeof Category.prototype.id
  >;

  public readonly payerList: HasManyRepositoryFactory<
    PayerList,
    typeof Category.prototype.id
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CategoryBillRepository')
    protected categoryBillRepositoryGetter: Getter<CategoryBillRepository>,
    @repository.getter('BillListRepository')
    protected billListRepositoryGetter: Getter<BillListRepository>,
    @repository.getter('PayerListRepository')
    protected payerListRepositoryGetter: Getter<PayerListRepository>,
  ) {
    super(Category, dataSource);
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

    this.categoryBills = this.createHasManyRepositoryFactoryFor(
      'categoryBills',
      categoryBillRepositoryGetter,
    );
    this.registerInclusionResolver(
      'categoryBills',
      this.categoryBills.inclusionResolver,
    );

    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser',
      usersRepositoryGetter,
    );
  }
}
