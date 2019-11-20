import {DefaultCrudRepository} from '@loopback/repository';
import {User} from '../models';
import {MongodsDataSource} from '../datasources';
import {inject} from '@loopback/core';

export type Credentials = {
  phone: string;
  password: string;
};

export class UsersRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id
> {
  constructor(@inject('datasources.mongods') dataSource: MongodsDataSource) {
    super(User, dataSource);
  }
}
