import {
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
  DefaultCrudRepository,
} from '@loopback/repository';
import { inject, Getter } from '@loopback/core';
import { MariadbDataSource } from '../datasources';
import {
  Dongs,
  DongsRelations,
  Users,
  BillList,
  PayerList,
  Categories,
  Scores,
  JointAccounts,
  Receipts,
} from '../models';
import {
  UsersRepository,
  BillListRepository,
  PayerListRepository,
  CategoriesRepository,
  ScoresRepository,
  JointAccountsRepository,
} from '.';
import { ReceiptionsRepository } from './receipts.repository';

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

  public readonly receipts: HasManyRepositoryFactory<Receipts, typeof Dongs.prototype.dongId>;

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
    @repository.getter('ReceiptionsRepository')
    protected receiptionsRepositoryGetter: Getter<ReceiptionsRepository>,
  ) {
    super(Dongs, dataSource);

    this.receipts = this.createHasManyRepositoryFactoryFor(
      'receiptions',
      receiptionsRepositoryGetter,
    );
    this.registerInclusionResolver('receiptions', this.receipts.inclusionResolver);

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
