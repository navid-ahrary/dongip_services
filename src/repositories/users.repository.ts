import {DefaultCrudRepository} from '@loopback/repository';
import {User} from '../models';
import {UsersDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class UsersRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.name
> {
  constructor(@inject('datasources.Users') dataSource: UsersDataSource) {
    super(User, dataSource);
  }
}
