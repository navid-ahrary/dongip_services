import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import { Notifications, NotificationsRelations, Users } from '../models';
import { UsersRepository } from './users.repository';

export class NotificationsRepository extends DefaultCrudRepository<
  Notifications,
  typeof Notifications.prototype.notifyId,
  NotificationsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Notifications.prototype.notifyId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Notifications, dataSource);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
  }
}
