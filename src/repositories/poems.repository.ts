import { DefaultCrudRepository } from '@loopback/repository'
import { Poems, PoemsRelations } from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject } from '@loopback/core'

export class PoemRepository extends DefaultCrudRepository<
  Poems,
  typeof Poems.prototype._key,
  PoemsRelations
  > {
  constructor (
    @inject( 'datasources.arangodb' ) dataSource: ArangodbDataSource,
  ) {
    super( Poems, dataSource )
  }


  // Get random verse
  public async getVerse () {
    const count = await this.count()
    const randomNumber = Math.floor( Math.random() * ( count.count + 1 ) )
    const verse = await this.findOne( {
      offset: randomNumber,
      limit: 1,
      fields: {
        '1': true,
        '2': true,
      }
    } )
    return verse?.[ 1 ]! + '-' + verse?.[ 2 ]!
  }
}
