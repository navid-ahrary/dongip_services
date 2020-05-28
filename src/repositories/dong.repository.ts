import {
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
  DefaultTransactionalRepository,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {MysqlDataSource} from '../datasources';
import {Dong, DongRelations, Users, BillList, PayerList} from '../models';
import {UsersRepository, CategoryRepository} from '.';
import {BillListRepository} from './bill-list.repository';
import {PayerListRepository} from './payer-list.repository';

export class DongRepository extends DefaultTransactionalRepository<
  Dong,
  typeof Dong.prototype.id,
  DongRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users,
    typeof Dong.prototype.id
  >;

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
