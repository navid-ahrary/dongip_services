import {DefaultKeyValueRepository} from '@loopback/repository';
import {User} from '../models';
import {RedisDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class UserRepository extends DefaultKeyValueRepository<User> {
  constructor(@inject('datasources.redisds') dataSource: RedisDataSource) {
    super(User, dataSource);
  }
}
