import {DefaultTransactionalRepository} from '@loopback/repository';
import {Verify, VerifyRelations} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class VerifyRepository extends DefaultTransactionalRepository<
  Verify,
  typeof Verify.prototype.id,
  VerifyRelations
> {
  constructor(@inject('datasources.Mysql') dataSource: MysqlDataSource) {
    super(Verify, dataSource);
  }
}
