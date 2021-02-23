import { DefaultCrudRepository } from '@loopback/repository';
import { inject } from '@loopback/core';
import { Verify, VerifyRelations } from '../models';
import { MariadbDataSource } from '../datasources';

export class VerifyRepository extends DefaultCrudRepository<
  Verify,
  typeof Verify.prototype.verifyId,
  VerifyRelations
> {
  constructor(@inject('datasources.Mariadb') dataSource: MariadbDataSource) {
    super(Verify, dataSource);
  }
}
