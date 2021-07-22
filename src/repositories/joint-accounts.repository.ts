import { Getter, inject } from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository,
} from '@loopback/repository';
import { DongsRepository, JointAccountSubscribesRepository, UsersRepository } from '.';
import { MariadbDataSource } from '../datasources';
import {
  Dongs,
  JointAccounts,
  JointAccountsRelations,
  JointAccountSubscribes,
  Users,
} from '../models';

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

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('JointAccountSubscribesRepository')
    protected jointAccountSubscribesRepositoryGetter: Getter<JointAccountSubscribesRepository>,
    @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super(JointAccounts, dataSource);

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
