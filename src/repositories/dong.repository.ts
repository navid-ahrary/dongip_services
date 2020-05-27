import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {MysqlDataSource} from '../datasources';
import {
  Dong,
  DongRelations,
  Users,
  CategoryBill,
  BillList,
  PayerList,
} from '../models';
import {UsersRepository, CategoryRepository} from '.';
import {CategoryBillRepository} from './category-bill.repository';
import {BillListRepository} from './bill-list.repository';
import {PayerListRepository} from './payer-list.repository';

export class DongRepository extends DefaultCrudRepository<
  Dong,
  typeof Dong.prototype.id,
  DongRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users,
    typeof Dong.prototype.id
  >;

  // public readonly categoryBills: HasManyRepositoryFactory<
  //   CategoryBill,
  //   typeof Dong.prototype.id
  // >;

  public readonly billList: HasManyRepositoryFactory<
    BillList,
    typeof Dong.prototype.id
  >;

  public readonly payerList: HasManyRepositoryFactory<
    PayerList,
    typeof Dong.prototype.id
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    // @repository.getter('CategoryBillRepository')
    // protected categoryBillRepositoryGetter: Getter<CategoryBillRepository>,
    @repository.getter('BillListRepository')
    protected billListRepositoryGetter: Getter<BillListRepository>,
    @repository.getter('PayerListRepository')
    protected payerListRepositoryGetter: Getter<PayerListRepository>,
  ) {
    super(Dong, dataSource);
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
    // this.categoryBills = this.createHasManyRepositoryFactoryFor(
    //   'categoryBills',
    //   categoryBillRepositoryGetter,
    // );
    // this.registerInclusionResolver(
    //   'categoryBills',
    //   this.categoryBills.inclusionResolver,
    // );

    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser',
      usersRepositoryGetter,
    );
    this.registerInclusionResolver(
      'belongsToUser',
      this.belongsToUser.inclusionResolver,
    );
  }
}
