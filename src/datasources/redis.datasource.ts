import {
  inject,
  lifeCycleObserver,
  LifeCycleObserver,
  ValueOrPromise,
} from '@loopback/core';
import { juggler } from '@loopback/repository';
import config = require('./redis.datasource.config.json');
import dotenv = require('dotenv');

dotenv.config();

config.host = String(process.env.REDIS_HOST);
config.port = Number(process.env.REDIS_PORT);
config.db = Number(process.env.REDIS_DB);

@lifeCycleObserver('datasource')
export class RedisDataSource extends juggler.DataSource implements LifeCycleObserver {
  static dataSourceName = 'redisds';

  constructor(
    @inject('datasources.config.redis', { optional: true })
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }

  /**
   * Start the datasource when application is started
   */
  start(): ValueOrPromise<void> {
    // Add your logic here to be invoked when the application is started
  }

  /**
   * Disconnect the datasource when application is stopped. This allows the
   * application to be shut down gracefully.
   */
  stop(): ValueOrPromise<void> {
    return super.disconnect();
  }
}
