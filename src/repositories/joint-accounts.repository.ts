import { Getter, inject } from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository,
} from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import {
  Accounts,
  Dongs,
  JointAccounts,
  JointAccountsRelations,
  JointAccountSubscribes,
  Users,
} from '../models';
import { AccountsRepository } from './accounts.repository';
import { DongsRepository } from './dongs.repository';
import { JointAccountSubscribesRepository } from './joint-account-subscribes.repository';
import { UsersRepository } from './users.repository';

export class JointAccountsRepository extends DefaultCrudRepository<
  JointAccounts,
  typeof JointAccounts.prototype.jointAccountId,
  JointAccountsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof JointAccounts.prototype.jointAccountId>;

  public readonly jointAccountSubscribes: HasManyRepositoryFactory<
    JointAccountSubscribes,
    typeof JointAccounts.prototype.jointAccountId
  >;

  public readonly dongs: HasManyRepositoryFactory<
    Dongs,
    typeof JointAccounts.prototype.jointAccountId
  >;

  public readonly account: BelongsToAccessor<
    Accounts,
    typeof JointAccounts.prototype.jointAccountId
  >;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('JointAccountSubscribesRepository')
    protected jointAccountSubscribesRepositoryGetter: Getter<JointAccountSubscribesRepository>,
    @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>,
    @repository.getter('AccountsRepository')
    protected accountsRepositoryGetter: Getter<AccountsRepository>,
  ) {
    super(JointAccounts, dataSource);
    this.account = this.createBelongsToAccessorFor('account', accountsRepositoryGetter);

    this.dongs = this.createHasManyRepositoryFactoryFor('dongs', dongsRepositoryGetter);
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);

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
