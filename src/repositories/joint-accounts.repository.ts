import {DefaultCrudRepository} from '@loopback/repository';
import {inject} from '@loopback/core';

import {JointAccounts, JointAccountsRelations} from '../models';
import {MysqlDataSource} from '../datasources';

export class JointAccountsRepository extends DefaultCrudRepository<
  JointAccounts,
  typeof JointAccounts.prototype.jointAccountId,
  JointAccountsRelations
> {
  constructor(@inject('datasources.Mysql') dataSource: MysqlDataSource) {
    super(JointAccounts, dataSource);
  }
}
