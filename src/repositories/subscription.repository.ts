import {DefaultCrudRepository} from '@loopback/repository';
import {Subscription, SubscriptionRelations} from '../models';
import {UsersDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class SubscriptionRepository extends DefaultCrudRepository<
  Subscription,
  typeof Subscription.prototype.id,
  SubscriptionRelations
> {
  constructor(@inject('datasources.Users') dataSource: UsersDataSource) {
    super(Subscription, dataSource);
  }
}
