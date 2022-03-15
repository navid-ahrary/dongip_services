import { Getter, inject } from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  HasOneRepositoryFactory,
  repository,
} from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import {
  Accounts,
  BillList,
  Categories,
  Dongs,
  DongsRelations,
  JointAccounts,
  PayerList,
  Receipts,
  Scores,
  Users,
  Wallets,
} from '../models';
import { AccountsRepository } from './accounts.repository';
import { BillListRepository } from './bill-list.repository';
import { CategoriesRepository } from './categories.repository';
import { JointAccountsRepository } from './joint-accounts.repository';
import { PayerListRepository } from './payer-list.repository';
import { ReceiptsRepository } from './receipts.repository';
import { ScoresRepository } from './scores.repository';
import { UsersRepository } from './users.repository';
import { WalletsRepository } from './wallets.repository';

export class DongsRepository extends DefaultCrudRepository<
  Dongs,
  typeof Dongs.prototype.dongId,
  DongsRelations
> {
  public readonly users: BelongsToAccessor<Users, typeof Dongs.prototype.dongId>;

  public readonly billList: HasManyRepositoryFactory<BillList, typeof Dongs.prototype.dongId>;

  public readonly payerList: HasManyRepositoryFactory<PayerList, typeof Dongs.prototype.dongId>;

  public readonly category: BelongsToAccessor<Categories, typeof Dongs.prototype.dongId>;

  public readonly scores: HasManyRepositoryFactory<Scores, typeof Dongs.prototype.dongId>;

  public readonly jointAccount: BelongsToAccessor<JointAccounts, typeof Dongs.prototype.dongId>;

  public readonly receipt: HasOneRepositoryFactory<Receipts, typeof Dongs.prototype.dongId>;

  public readonly wallet: BelongsToAccessor<Wallets, typeof Dongs.prototype.dongId>;

  public readonly account: BelongsToAccessor<Accounts, typeof Dongs.prototype.dongId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CategoriesRepository')
    protected categoryRepositoryGetter: Getter<CategoriesRepository>,
    @repository.getter('BillListRepository')
    protected billListRepositoryGetter: Getter<BillListRepository>,
    @repository.getter('PayerListRepository')
    protected payerListRepositoryGetter: Getter<PayerListRepository>,
    @repository.getter('ScoresRepository')
    protected scoresRepositoryGetter: Getter<ScoresRepository>,
    @repository.getter('JointAccountsRepository')
    protected jointAccountsRepositoryGetter: Getter<JointAccountsRepository>,
    @repository.getter('ReceiptsRepository')
    protected receiptsRepositoryGetter: Getter<ReceiptsRepository>,
    @repository.getter('WalletsRepository')
    protected walletsRepositoryGetter: Getter<WalletsRepository>,
    @repository.getter('AccountsRepository')
    protected accountsRepositoryGetter: Getter<AccountsRepository>,
  ) {
    super(Dongs, dataSource);
    this.account = this.createBelongsToAccessorFor('account', accountsRepositoryGetter);

    this.wallet = this.createBelongsToAccessorFor('wallet', walletsRepositoryGetter);
    this.registerInclusionResolver('wallet', this.wallet.inclusionResolver);

    this.receipt = this.createHasOneRepositoryFactoryFor('receipt', receiptsRepositoryGetter);
    this.registerInclusionResolver('receipt', this.receipt.inclusionResolver);

    this.jointAccount = this.createBelongsToAccessorFor(
      'jointAccount',
      jointAccountsRepositoryGetter,
    );
    this.registerInclusionResolver('jointAccount', this.jointAccount.inclusionResolver);

    this.scores = this.createHasManyRepositoryFactoryFor('scores', scoresRepositoryGetter);
    this.registerInclusionResolver('scores', this.scores.inclusionResolver);

    this.category = this.createBelongsToAccessorFor('category', categoryRepositoryGetter);
    this.registerInclusionResolver('category', this.category.inclusionResolver);

    this.payerList = this.createHasManyRepositoryFactoryFor('payerList', payerListRepositoryGetter);
    this.registerInclusionResolver('payerList', this.payerList.inclusionResolver);

    this.billList = this.createHasManyRepositoryFactoryFor('billList', billListRepositoryGetter);
    this.registerInclusionResolver('billList', this.billList.inclusionResolver);

    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
    this.registerInclusionResolver('users', this.users.inclusionResolver);
  }
}
