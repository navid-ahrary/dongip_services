import { inject } from '@loopback/core';
import { DefaultCrudRepository } from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import { Blacklist, BlacklistRelations } from '../models';

export class BlacklistRepository extends DefaultCrudRepository<
  Blacklist,
  typeof Blacklist.prototype.token,
  BlacklistRelations
> {
  constructor(@inject('datasources.Mariadb') dataSource: MariadbDataSource) {
    super(Blacklist, dataSource);
  }
}
