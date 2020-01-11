import {
  inject,
  lifeCycleObserver,
  LifeCycleObserver,
  ValueOrPromise,
} from '@loopback/core';
import { juggler } from '@loopback/repository';
import config from './neo-4-j.datasource.config.json';
import dotenv = require('dotenv');

dotenv.config();

config.host = String(process.env.NEO4J_HOST);
config.port = Number(process.env.NEO4J_PORT);
config.username = String(process.env.NEO4J_USERNAME);
config.password = String(process.env.NEO4J_PASSWORD);

@lifeCycleObserver('datasource')
export class Neo4JDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'neo4j';

  constructor(
    @inject('datasources.config.neo4j', { optional: true })
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
