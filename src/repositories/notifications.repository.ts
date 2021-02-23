import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { inject, Getter } from '@loopback/core';
import { Notifications, NotificationsRelations, Users } from '../models';
import { MariadbDataSource } from '../datasources';
import { UsersRepository } from '.';

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
