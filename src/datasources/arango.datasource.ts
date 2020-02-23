import {
  inject,
  lifeCycleObserver,
  LifeCycleObserver,
  ValueOrPromise,
} from '@loopback/core'
import { juggler } from '@loopback/repository'
import { config } from 'dotenv'

import settings from './arango.datasource.config.json'


@lifeCycleObserver( 'datasource' )
export class ArangodbDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'arangodb';

  constructor (
    @inject( 'datasources.config.arangodb', { optional: true } )
    dsConfig: typeof settings = settings,
  ) {
    config()

    dsConfig.username = String( process.env.ARANGODB_USERNAME )
    dsConfig.password = String( process.env.ARANGODB_PASSWORD )
    dsConfig.database = String( process.env.ARANGODB_DATABASE )

    super( dsConfig )
  }

  /**
   * Start the datasource when application is started
   */
  start (): ValueOrPromise<void> {
    // Add your logic here to be invoked when the application is started
  }

  /**
   * Disconnect the datasource when application is stopped. This allows the
   * application to be shut down gracefully.
   */
  stop (): ValueOrPromise<void> {
    return super.disconnect()
  }
}
