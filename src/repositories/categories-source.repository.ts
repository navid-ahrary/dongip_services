import {DefaultCrudRepository} from '@loopback/repository';
import {CategoriesSource, CategoriesSourceRelations} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class CategoriesSourceRepository extends DefaultCrudRepository<
  CategoriesSource,
  typeof CategoriesSource.prototype.title,
  CategoriesSourceRelations
> {
  constructor(@inject('datasources.Mysql') dataSource: MysqlDataSource) {
    super(CategoriesSource, dataSource);
  }
}
