import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';
import {
  SubscriptionTransactions,
  SubscriptionTransactionsRelations,
  Users,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';

export class SubscriptionTransactionsRepository extends DefaultCrudRepository<
  SubscriptionTransactions,
  typeof SubscriptionTransactions.prototype.wcTransactionKey,
  SubscriptionTransactionsRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof SubscriptionTransactions.prototype.wcTransactionKey
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(SubscriptionTransactions, dataSource);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
