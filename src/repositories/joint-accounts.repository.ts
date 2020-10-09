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
  JointAccountSubscribe,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {UsersRepository} from './users.repository';
import {JointAccountSubscribeRepository} from './joint-account-subscribe.repository';

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
    JointAccountSubscribe,
    typeof JointAccounts.prototype.jointAccountId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('JointAccountSubscribeRepository')
    protected jointAccountSubscribeRepositoryGetter: Getter<
      JointAccountSubscribeRepository
    >,
  ) {
    super(JointAccounts, dataSource);
    this.jointAccountSubscribes = this.createHasManyRepositoryFactoryFor(
      'jointAccountSubscribes',
      jointAccountSubscribeRepositoryGetter,
    );
    this.registerInclusionResolver(
      'jointAccountSubscribes',
      this.jointAccountSubscribes.inclusionResolver,
    );

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
