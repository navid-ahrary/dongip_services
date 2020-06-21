import {DefaultCrudRepository} from '@loopback/repository';
import {Verify, VerifyRelations} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class VerifyRepository extends DefaultCrudRepository<
  Verify,
  typeof Verify.prototype.verifyId,
  VerifyRelations
> {
  constructor(@inject('datasources.Mysql') dataSource: MysqlDataSource) {
    super(Verify, dataSource);
  }
}
