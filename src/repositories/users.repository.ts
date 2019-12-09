import {
  DefaultCrudRepository,
  repository,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {Users, VirtualFriends} from '../models';
import {MongodsDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {VirtualFriendsRepository} from './virtual-friends.repository';

export type Credentials = {
  phone: string;
  password: string;
};

export class UsersRepository extends DefaultCrudRepository<
  Users,
  typeof Users.prototype.id
> {
  public readonly virtualFriends: HasManyRepositoryFactory<
    VirtualFriends,
    typeof Users.prototype.id
  >;

  public readonly users: HasManyRepositoryFactory<Users, typeof Users.prototype.id>;

  constructor(
    @inject('datasources.mongods') dataSource: MongodsDataSource,
    @repository.getter('VirtualFriendsRepository')
    protected virtualFriendsRepositoryGetter: Getter<VirtualFriendsRepository>,
  ) {
    super(Users, dataSource);
    this.virtualFriends = this.createHasManyRepositoryFactoryFor(
      'virtualFriends',
      virtualFriendsRepositoryGetter,
    );

    this.registerInclusionResolver(
      'virtualFriends',
      this.virtualFriends.inclusionResolver,
    );
  }
}
