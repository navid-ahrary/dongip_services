import {Filter, DefaultTransactionalRepository} from '@loopback/repository';
import {Blacklist, BlacklistRelations} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class BlacklistRepository extends DefaultTransactionalRepository<
  Blacklist,
  typeof Blacklist.prototype.id,
  BlacklistRelations
> {
  constructor(@inject('datasources.Mysql') dataSource: MysqlDataSource) {
    super(Blacklist, dataSource);
  }

  public async checkTokenNotBlacklisted(filter: Filter): Promise<void> {
    const exist = await this.find(filter);
    if (exist.length === 0) {
      return;
    } else {
      throw new Error('Token is blacklisted!');
    }
  }
}
