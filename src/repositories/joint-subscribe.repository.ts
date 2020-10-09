import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';
import {
  JointSubscribe,
  JointSubscribeRelations,
  JointAccounts,
  Users,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {JointAccountsRepository} from './joint-accounts.repository';
import {UsersRepository} from './users.repository';

export class JointSubscribeRepository extends DefaultCrudRepository<
  JointSubscribe,
  typeof JointSubscribe.prototype.jointSubscriberId,
  JointSubscribeRelations
> {
  public readonly jointAccount: BelongsToAccessor<
    JointAccounts,
    typeof JointSubscribe.prototype.jointSubscriberId
  >;

  public readonly user: BelongsToAccessor<
    Users,
    typeof JointSubscribe.prototype.jointSubscriberId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('JointAccountsRepository')
    protected jointAccountsRepositoryGetter: Getter<JointAccountsRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(JointSubscribe, dataSource);
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
