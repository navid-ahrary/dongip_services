import {DefaultCrudRepository} from '@loopback/repository';
import {Dongs, DongsRelations} from '../models';
import {DongsDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class DongsRepository extends DefaultCrudRepository<
  Dongs,
  typeof Dongs.prototype.id,
  DongsRelations
> {
  constructor(@inject('datasources.Dongs') dataSource: DongsDataSource) {
    super(Dongs, dataSource);
  }
}
