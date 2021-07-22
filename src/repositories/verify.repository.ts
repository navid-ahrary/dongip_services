import { inject } from '@loopback/core';
import { DefaultCrudRepository } from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import { Verify, VerifyRelations } from '../models';

export class VerifyRepository extends DefaultCrudRepository<
  Verify,
  typeof Verify.prototype.verifyId,
  VerifyRelations
> {
  constructor(@inject('datasources.Mariadb') dataSource: MariadbDataSource) {
    super(Verify, dataSource);
  }
}
