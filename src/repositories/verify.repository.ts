import {DefaultCrudRepository, DataObject} from '@loopback/repository'
import {Verify, VerifyRelations} from '../models'
import {ArangodbDataSource} from '../datasources'
import {inject} from '@loopback/core'

export class VerifyRepository extends DefaultCrudRepository<
  Verify,
  typeof Verify.prototype._key,
  VerifyRelations
  > {
  constructor (@inject('datasources.arangodb') dataSource: ArangodbDataSource) {
    super(Verify, dataSource)
  }

  /**
* create model like a human being
*/
  public async createHumanKind (entity: DataObject<Verify>): Promise<Verify> {
    const verify = await this.create(entity)
    verify._key = verify._key[0]
    return verify
  }
}
