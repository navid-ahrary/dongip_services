import {DefaultCrudRepository} from '@loopback/repository';
import {Verify, VerifyRelations} from '../models';
import {ArangodbDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class VerifyRepository extends DefaultCrudRepository<
  Verify,
  typeof Verify.prototype._key,
  VerifyRelations
> {
  constructor(@inject('datasources.arangodb') dataSource: ArangodbDataSource) {
    super(Verify, dataSource);
  }
}
