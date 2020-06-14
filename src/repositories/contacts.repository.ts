import {DefaultCrudRepository} from '@loopback/repository';
import {Contacts, ContactsRelations} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class ContactsRepository extends DefaultCrudRepository<
  Contacts,
  typeof Contacts.prototype.id,
  ContactsRelations
> {
  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
  ) {
    super(Contacts, dataSource);
  }
}
