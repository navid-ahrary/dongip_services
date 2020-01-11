import { DefaultCrudRepository } from '@loopback/repository';
import { Blacklist, BlacklistRelations } from '../models';
import { ArangodbDataSource } from '../datasources';
import { inject } from '@loopback/core';

export class BlacklistRepository extends DefaultCrudRepository<
  Blacklist,
  typeof Blacklist.prototype.id,
  BlacklistRelations
  > {
  constructor(
    @inject('datasources.arangodb') dataSource: ArangodbDataSource,
  ) {
    super(Blacklist, dataSource);
  }
}
