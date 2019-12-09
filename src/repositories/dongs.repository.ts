import {DefaultCrudRepository} from '@loopback/repository';
import {Dongs} from '../models';
import {MongodsDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class DongsRepository extends DefaultCrudRepository<
  Dongs,
  typeof Dongs.prototype.id
> {
  constructor(@inject('datasources.mongods') dataSource: MongodsDataSource) {
    super(Dongs, dataSource);
  }
}
