import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { JointAccountsRepository, UsersRepository } from '.';
import { MariadbDataSource } from '../datasources';
import {
  JointAccounts,
  JointAccountSubscribes,
  JointAccountSubscribesRelations,
  Users,
} from '../models';

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
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('JointAccountsRepository')
    protected jointAccountsRepositoryGetter: Getter<JointAccountsRepository>,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(JointAccountSubscribes, dataSource);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);

    this.jointAccount = this.createBelongsToAccessorFor(
      'jointAccount',
      jointAccountsRepositoryGetter,
    );
    this.registerInclusionResolver('jointAccount', this.jointAccount.inclusionResolver);
  }
}
