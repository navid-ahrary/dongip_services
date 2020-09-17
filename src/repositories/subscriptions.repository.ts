import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';
import {Subscriptions, SubscriptionsRelations, Users} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';

export class SubscriptionsRepository extends DefaultCrudRepository<
  Subscriptions,
  typeof Subscriptions.prototype.subscriptionId,
  SubscriptionsRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof Subscriptions.prototype.subscriptionId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Subscriptions, dataSource);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
