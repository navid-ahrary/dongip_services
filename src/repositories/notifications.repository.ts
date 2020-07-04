import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';
import {Notifications, NotificationsRelations, Users} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';

export class NotificationsRepository extends DefaultCrudRepository<
  Notifications,
  typeof Notifications.prototype.notifyId,
  NotificationsRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof Notifications.prototype.notifyId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Notifications, dataSource);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
  }
}
