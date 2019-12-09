import {DefaultCrudRepository} from '@loopback/repository';
import {VirtualFriends, VirtualFriendsRelations} from '../models';
import {MongodsDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class VirtualFriendsRepository extends DefaultCrudRepository<
  VirtualFriends,
  typeof VirtualFriends.prototype.id,
  VirtualFriendsRelations
> {
  constructor(@inject('datasources.mongods') dataSource: MongodsDataSource) {
    super(VirtualFriends, dataSource);
  }
}
