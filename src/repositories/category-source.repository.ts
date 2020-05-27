import {DefaultCrudRepository} from '@loopback/repository';
import {CategorySource, CategorySourceRelations} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class CategorySourceRepository extends DefaultCrudRepository<
  CategorySource,
  typeof CategorySource.prototype.title,
  CategorySourceRelations
> {
  constructor(@inject('datasources.Mysql') dataSource: MysqlDataSource) {
    super(CategorySource, dataSource);
  }
}
