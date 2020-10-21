import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {JointBills, JointBillsRelations, Users, JointAccounts} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';
import {JointAccountsRepository} from './joint-accounts.repository';

export class JointBillsRepository extends DefaultCrudRepository<
  JointBills,
  typeof JointBills.prototype.jointBillId,
  JointBillsRelations
> {

  public readonly user: BelongsToAccessor<Users, typeof JointBills.prototype.jointBillId>;

  public readonly jointAccount: BelongsToAccessor<JointAccounts, typeof JointBills.prototype.jointBillId>;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource, @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>, @repository.getter('JointAccountsRepository') protected jointAccountsRepositoryGetter: Getter<JointAccountsRepository>,
  ) {
    super(JointBills, dataSource);
    this.jointAccount = this.createBelongsToAccessorFor('jointAccount', jointAccountsRepositoryGetter,);
    this.registerInclusionResolver('jointAccount', this.jointAccount.inclusionResolver);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter,);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
