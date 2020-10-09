import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';

import {
  JointAccountSubscribe,
  JointAccountSubscribeRelations,
  JointAccounts,
  Users,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {JointAccountsRepository} from './joint-accounts.repository';
import {UsersRepository} from './users.repository';

export class JointAccountSubscribeRepository extends DefaultCrudRepository<
  JointAccountSubscribe,
  typeof JointAccountSubscribe.prototype.jointSubscriberId,
  JointAccountSubscribeRelations
> {
  public readonly jointAccount: BelongsToAccessor<
    JointAccounts,
    typeof JointAccountSubscribe.prototype.jointSubscriberId
  >;

  public readonly user: BelongsToAccessor<
    Users,
    typeof JointAccountSubscribe.prototype.jointSubscriberId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('JointAccountsRepository')
    protected jointAccountsRepositoryGetter: Getter<JointAccountsRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(JointAccountSubscribe, dataSource);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);

    this.jointAccount = this.createBelongsToAccessorFor(
      'jointAccount',
      jointAccountsRepositoryGetter,
    );
    this.registerInclusionResolver(
      'jointAccount',
      this.jointAccount.inclusionResolver,
    );
  }
}
