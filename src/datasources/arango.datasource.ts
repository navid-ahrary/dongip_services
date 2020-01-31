import
{
  inject,
  lifeCycleObserver,
  LifeCycleObserver,
  ValueOrPromise,
} from '@loopback/core'
import { juggler } from '@loopback/repository'
import settings from './arango.datasource.config.json'
import { config } from 'dotenv'
config()

settings.username = String( process.env.ARANGODB_USERNAME )
settings.password = String( process.env.ARANGODB_PASSWORD )
settings.database = String( process.env.ARANGODB_DATABASE )

@lifeCycleObserver( 'datasource' )
export class ArangodbDataSource extends juggler.DataSource
  implements LifeCycleObserver
{
  static dataSourceName = 'arangodb';

  constructor (
    @inject( 'datasources.config.arangodb', { optional: true } )
    dsConfig: object = settings,
  )
  {
    super( dsConfig )
  }

  /**
   * Start the datasource when application is started
   */
  start (): ValueOrPromise<void>
  {
    // Add your logic here to be invoked when the application is started
  }

  /**
   * Disconnect the datasource when application is stopped. This allows the
   * application to be shut down gracefully.
   */
  stop (): ValueOrPromise<void>
  {
    return super.disconnect()
  }
}
