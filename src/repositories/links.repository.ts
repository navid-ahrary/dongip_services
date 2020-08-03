import {DefaultCrudRepository} from '@loopback/repository';
import {Links, LinksRelations} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class LinksRepository extends DefaultCrudRepository<
  Links,
  typeof Links.prototype.name,
  LinksRelations
> {
  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
  ) {
    super(Links, dataSource);
  }
}
