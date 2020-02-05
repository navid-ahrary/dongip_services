import { DefaultCrudRepository } from '@loopback/repository'
import { Verifications, VerificationsRelations } from '../models'
import { ArangodbDataSource } from '../datasources'
import { inject } from '@loopback/core'

export class VerificationsRepository extends DefaultCrudRepository<
  Verifications,
  typeof Verifications.prototype._key,
  VerificationsRelations
  > {
  constructor (
    @inject( 'datasources.arangodb' ) dataSource: ArangodbDataSource,
  ) {
    super( Verifications, dataSource )
  }


  // Get random verify code
  public async getCode () {
    const count = await this.count()
    const randomNumber = Math.floor( Math.random() * count.count )
    const verifyCode = await this.findOne( {
      offset: randomNumber,
      limit: 1
    } )
    return verifyCode
  }
}
