import { inject, lifeCycleObserver, LifeCycleObserver } from '@loopback/core';
import { juggler } from '@loopback/repository';
import { MariadbConfigBinding } from '../keys';

@lifeCycleObserver('datasource')
export class MariadbDataSource extends juggler.DataSource implements LifeCycleObserver {
  static dataSourceName = 'Mariadb';

  constructor(@inject(MariadbConfigBinding) dsConfig: object) {
    super(dsConfig);
  }
}
