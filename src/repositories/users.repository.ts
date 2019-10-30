import {DefaultCrudRepository} from '@loopback/repository';
import {Users, UsersRelations} from '../models';
import {Neo4jDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class UsersRepository extends DefaultCrudRepository<
  Users,
  typeof Users.prototype.name,
  UsersRelations
> {
  constructor(@inject('datasources.Users') dataSource: Neo4jDataSource) {
    super(Users, dataSource);
  }
}
