import { inject, lifeCycleObserver, LifeCycleObserver } from '@loopback/core';
import { juggler } from '@loopback/repository';
import { MariadbConfigBinding } from '../keys';

const config = {
  name: 'Mariadb',
  connector: 'mysql',
  charset: 'utf8mb4',
  collation: 'utf8mb4_unicode_ci',
  supportBigNumbers: true,
  dateStrings: ['DATE'],
};

@lifeCycleObserver('datasource')
export class MariadbDataSource extends juggler.DataSource implements LifeCycleObserver {
  static dataSourceName = 'Mariadb';
  static readonly defaultConfig = config;

  constructor(@inject(MariadbConfigBinding) dsConfig: object) {
    super({ ...config, ...dsConfig });
  }
}
