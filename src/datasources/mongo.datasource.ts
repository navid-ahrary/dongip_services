import {
  inject,
  lifeCycleObserver,
  LifeCycleObserver,
  ValueOrPromise,
} from '@loopback/core';
import { juggler } from '@loopback/repository';
import config = require('./mongo.datasource.config.json');
import dotenv = require("dotenv");
dotenv.config();

config.host = String(process.env.MONGODB_HOST);
config.port = Number(process.env.MONGODB_PORT!);
config.database = String(process.env.MONGODB_DATABASE);

@lifeCycleObserver('datasource')
export class MongoDataSource extends juggler.DataSource implements LifeCycleObserver {
  static dataSourceName = 'mongods';


  constructor(
    @inject('datasources.config.mongo', { optional: true }) dsConfig: object = config,
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
