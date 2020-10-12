import {
  BelongsToAccessor,
  DefaultCrudRepository,
  repository,
} from '@loopback/repository';
import {
  JointAccounts,
  JointAccountSubscribes,
  JointAccountSubscribesRelations,
  Users,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {Getter, inject} from '@loopback/core';
import {UsersRepository} from './users.repository';
import {JointAccountsRepository} from './joint-accounts.repository';

export class JointAccountSubscribesRepository extends DefaultCrudRepository<
  JointAccountSubscribes,
  typeof JointAccountSubscribes.prototype.jointAccountSubscribeId,
  JointAccountSubscribesRelations
> {
  public readonly jointAccount: BelongsToAccessor<
    JointAccounts,
    typeof JointAccountSubscribes.prototype.jointAccountSubscribeId
  >;

  public readonly user: BelongsToAccessor<
    Users,
    typeof JointAccountSubscribes.prototype.jointAccountSubscribeId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('JointAccountsRepository')
    protected jointAccountsRepositoryGetter: Getter<JointAccountsRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(JointAccountSubscribes, dataSource);

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
