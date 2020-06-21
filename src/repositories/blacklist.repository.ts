import {DefaultCrudRepository} from '@loopback/repository';
import {Blacklist, BlacklistRelations} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class BlacklistRepository extends DefaultCrudRepository<
  Blacklist,
  typeof Blacklist.prototype.token,
  BlacklistRelations
> {
  constructor(@inject('datasources.Mysql') dataSource: MysqlDataSource) {
    super(Blacklist, dataSource);
  }
}
