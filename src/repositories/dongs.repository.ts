import {DefaultCrudRepository} from '@loopback/repository';
import {Dongs, DongsRelations} from '../models';
import {MongoDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class DongsRepository extends DefaultCrudRepository<
  Dongs,
  typeof Dongs.prototype.id,
  DongsRelations
> {
  constructor(@inject('datasources.mongods') dataSource: MongoDataSource) {
    super(Dongs, dataSource);
  }
}
