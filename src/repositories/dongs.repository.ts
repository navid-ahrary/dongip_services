import {
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
  DefaultCrudRepository,
} from '@loopback/repository';
import { inject, Getter } from '@loopback/core';

import { MysqlDataSource } from '../datasources';
import {
  Dongs,
  DongsRelations,
  Users,
  BillList,
  PayerList,
  Categories,
  Groups,
  Scores,
  JointAccounts,
  JointBills,
  JointPayers,
} from '../models';
import { UsersRepository } from './users.repository';
import { BillListRepository } from './bill-list.repository';
import { PayerListRepository } from './payer-list.repository';
import { CategoriesRepository } from './categories.repository';
import { GroupsRepository } from './groups.repository';
import { ScoresRepository } from './scores.repository';
import { JointAccountsRepository } from './joint-accounts.repository';
import { JointBillsRepository } from './joint-bills.repository';
import { JointPayersRepository } from './joint-payers.repository';

export class DongsRepository extends DefaultCrudRepository<
  Dongs,
  typeof Dongs.prototype.dongId,
  DongsRelations
> {
  public readonly users: BelongsToAccessor<Users, typeof Dongs.prototype.dongId>;

  public readonly billList: HasManyRepositoryFactory<BillList, typeof Dongs.prototype.dongId>;

  public readonly payerList: HasManyRepositoryFactory<PayerList, typeof Dongs.prototype.dongId>;

  public readonly categories: BelongsToAccessor<Categories, typeof Dongs.prototype.dongId>;

  public readonly group: BelongsToAccessor<Groups, typeof Dongs.prototype.dongId>;

  public readonly scores: HasManyRepositoryFactory<Scores, typeof Dongs.prototype.dongId>;

  public readonly jointAccount: BelongsToAccessor<JointAccounts, typeof Dongs.prototype.dongId>;

  public readonly jointBills: HasManyRepositoryFactory<JointBills, typeof Dongs.prototype.dongId>;

  public readonly jointPayers: HasManyRepositoryFactory<JointPayers, typeof Dongs.prototype.dongId>;

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
    @repository.getter('ScoresRepository')
    protected scoresRepositoryGetter: Getter<ScoresRepository>,
    @repository.getter('JointAccountsRepository')
    protected jointAccountsRepositoryGetter: Getter<JointAccountsRepository>,
    @repository.getter('JointBillsRepository')
    protected jointBillsRepositoryGetter: Getter<JointBillsRepository>,
    @repository.getter('JointPayersRepository')
    protected jointPayersRepositoryGetter: Getter<JointPayersRepository>,
  ) {
    super(Dongs, dataSource);
    this.jointPayers = this.createHasManyRepositoryFactoryFor(
      'jointPayers',
      jointPayersRepositoryGetter,
    );
    this.registerInclusionResolver('jointPayers', this.jointPayers.inclusionResolver);
    this.jointBills = this.createHasManyRepositoryFactoryFor(
      'jointBills',
      jointBillsRepositoryGetter,
    );
    this.registerInclusionResolver('jointBills', this.jointBills.inclusionResolver);
    this.jointAccount = this.createBelongsToAccessorFor(
      'jointAccount',
      jointAccountsRepositoryGetter,
    );
    this.registerInclusionResolver('jointAccount', this.jointAccount.inclusionResolver);
    this.scores = this.createHasManyRepositoryFactoryFor('scores', scoresRepositoryGetter);
    this.registerInclusionResolver('scores', this.scores.inclusionResolver);
    this.group = this.createBelongsToAccessorFor('group', groupsRepositoryGetter);
    this.registerInclusionResolver('group', this.group.inclusionResolver);

    this.categories = this.createBelongsToAccessorFor('categories', categoryRepositoryGetter);
    this.registerInclusionResolver('categories', this.categories.inclusionResolver);

    this.payerList = this.createHasManyRepositoryFactoryFor('payerList', payerListRepositoryGetter);
    this.registerInclusionResolver('payerList', this.payerList.inclusionResolver);

    this.billList = this.createHasManyRepositoryFactoryFor('billList', billListRepositoryGetter);
    this.registerInclusionResolver('billList', this.billList.inclusionResolver);

    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
    this.registerInclusionResolver('users', this.users.inclusionResolver);
  }
}
