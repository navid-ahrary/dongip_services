import {DefaultCrudRepository} from '@loopback/repository';
import {User} from '../models';
import {Neo4jDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class UsersRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.name
> {
  constructor(@inject('datasources.Neo4j') dataSource: Neo4jDataSource) {
    super(User, dataSource);
  }
}
