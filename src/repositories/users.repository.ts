import {DefaultCrudRepository} from '@loopback/repository';
import {Users, UsersRelations} from '../models';
import {UsersDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class UsersRepository extends DefaultCrudRepository<
  Users,
  typeof Users.prototype.phoneNumber,
  UsersRelations
> {
  constructor(@inject('datasources.db') dataSource: UsersDataSource) {
    super(Users, dataSource);
  }
}
