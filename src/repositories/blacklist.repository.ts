import { DefaultCrudRepository, Filter, DataObject } from '@loopback/repository'
import { Blacklist, BlacklistRelations } from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject } from '@loopback/core'
import { HttpErrors } from '@loopback/rest'

export class BlacklistRepository extends DefaultCrudRepository<
  Blacklist,
  typeof Blacklist.prototype._key,
  BlacklistRelations
  > {
  constructor (
    @inject( 'datasources.arangodb' ) dataSource: ArangodbDataSource,
  ) {
    super( Blacklist, dataSource )
  }

  public async checkTokenNotBlacklisted ( filter: Filter ): Promise<void> {
    const exist = await this.find( filter )
    if ( exist.length === 0 ) {
      return
    } else {
      throw new HttpErrors.NotFound( 'Token is blacklisted!' )
    }
  }

  /**
  * create model like a human being
  */
  public async createHumanKind ( entity: DataObject<Blacklist> )
    : Promise<Blacklist> {
    const blackList = await this.create( entity )
    blackList._id = blackList._key[ 1 ]
    blackList._key = blackList._key[ 0 ]
    return blackList
  }
}
