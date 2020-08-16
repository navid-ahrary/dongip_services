import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

const config = {
  name: 'cafebazaar',
  connector: 'rest',
  baseURL: 'https://pardakht.cafebazaar.ir/devapi/v2/api/applications/',
  crud: true,
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class CafebazaarDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'cafebazaar';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.cafebazaar', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}
