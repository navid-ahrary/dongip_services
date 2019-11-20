import {DefaultCrudRepository} from '@loopback/repository';
import {Dong, DongsRelations} from '../models';
import {MongodsDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class DongsRepository extends DefaultCrudRepository<
  Dong,
  typeof Dong.prototype.id,
  DongsRelations
> {
  constructor(@inject('datasources.mongods') dataSource: MongodsDataSource) {
    super(Dong, dataSource);
  }
}
