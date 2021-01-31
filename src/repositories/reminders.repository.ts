import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { inject, Getter } from '@loopback/core';
import { Reminders, RemindersRelations, Users } from '../models';
import { MysqlDataSource } from '../datasources';
import { UsersRepository } from './users.repository';

export class RemindersRepository extends DefaultCrudRepository<
  Reminders,
  typeof Reminders.prototype.reminderId,
  RemindersRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Reminders.prototype.reminderId>;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Reminders, dataSource);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
  }
}
