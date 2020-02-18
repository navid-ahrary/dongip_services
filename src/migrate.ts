import { MyApplication } from './application'

export async function migrate ( args: string[] ) {
  const existingSchema = args.includes( '--rebuild' ) ? 'drop' : 'alter'
  console.log( 'Migrating schemas (%s existing schema)', existingSchema )

  const app = new MyApplication()
  await app.boot()
  await app.migrateSchema( { existingSchema } )

  // Connectors usually keep a pool of opened connections,
  // this keeps the process running even after all work is done.
  // We need to exit explicitly.
  process.exit( 0 )
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
migrate( process.argv ).catch( err => {
  console.error( 'Cannot migrate database schema', err )
  process.exit( 1 )
} )
