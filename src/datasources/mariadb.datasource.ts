import { inject, lifeCycleObserver, LifeCycleObserver } from '@loopback/core';
import { juggler } from '@loopback/repository';
import { MariadbBinding } from '../keys';

@lifeCycleObserver('datasource')
export class MariadbDataSource extends juggler.DataSource implements LifeCycleObserver {
  static dataSourceName = 'Mariadb';

  constructor(@inject(MariadbBinding.MARIADB_CONFIG) dsConfig: object) {
    super(dsConfig);
  }
}
