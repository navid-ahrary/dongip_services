import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {
  JointAccounts,
  JointAccountsRelations,
  Users,
  JointAccountSubscribes,
  BillList, Dongs, PayerList} from '../models';
import {MysqlDataSource} from '../datasources';
import {UsersRepository} from './users.repository';
import {JointAccountSubscribesRepository} from './joint-account-subscribes.repository';
import {BillListRepository} from './bill-list.repository';
import {DongsRepository} from './dongs.repository';
import {PayerListRepository} from './payer-list.repository';

export class JointAccountsRepository extends DefaultCrudRepository<
  JointAccounts,
  typeof JointAccounts.prototype.jointAccountId,
  JointAccountsRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof JointAccounts.prototype.jointAccountId
  >;

  public readonly jointAccountSubscribes: HasManyRepositoryFactory<
    JointAccountSubscribes,
    typeof JointAccounts.prototype.jointAccountId
  >;

  public readonly billList: HasManyRepositoryFactory<
    BillList,
    typeof JointAccounts.prototype.jointAccountId
  >;

  public readonly dongs: HasManyRepositoryFactory<Dongs, typeof JointAccounts.prototype.jointAccountId>;

  public readonly payerLists: HasManyRepositoryFactory<PayerList, typeof JointAccounts.prototype.jointAccountId>;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('JointAccountSubscribesRepository')
    protected jointAccountSubscribesRepositoryGetter: Getter<
      JointAccountSubscribesRepository
    >,
    @repository.getter('BillListRepository')
    protected billListRepositoryGetter: Getter<BillListRepository>, @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>, @repository.getter('PayerListRepository') protected payerListRepositoryGetter: Getter<PayerListRepository>,
  ) {
    super(JointAccounts, dataSource);
    this.payerLists = this.createHasManyRepositoryFactoryFor('payerLists', payerListRepositoryGetter,);
    this.registerInclusionResolver('payerLists', this.payerLists.inclusionResolver);
    this.dongs = this.createHasManyRepositoryFactoryFor('dongs', dongsRepositoryGetter,);
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);
    this.billList = this.createHasManyRepositoryFactoryFor(
      'billList',
      billListRepositoryGetter,
    );
    this.registerInclusionResolver('billList', this.billList.inclusionResolver);
    this.jointAccountSubscribes = this.createHasManyRepositoryFactoryFor(
      'jointAccountSubscribes',
      jointAccountSubscribesRepositoryGetter,
    );
    this.registerInclusionResolver(
      'jointAccountSubscribes',
      this.jointAccountSubscribes.inclusionResolver,
    );

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
