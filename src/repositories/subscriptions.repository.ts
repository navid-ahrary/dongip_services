import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { UsersRepository } from '.';
import { MariadbDataSource } from '../datasources';
import { Subscriptions, SubscriptionsRelations, Users } from '../models';

export class SubscriptionsRepository extends DefaultCrudRepository<
  Subscriptions,
  typeof Subscriptions.prototype.subscriptionId,
  SubscriptionsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Subscriptions.prototype.subscriptionId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Subscriptions, dataSource);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
