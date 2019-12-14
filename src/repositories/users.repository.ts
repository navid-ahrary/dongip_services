import {
  DefaultCrudRepository,
  repository,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {Users, Dongs, VirtualUsers} from '../models';
import {MongodsDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {DongsRepository} from './dongs.repository';
import {VirtualUsersRepository} from './virtual-users.repository';

export type Credentials = {
  phone: string;
  password: string;
};

export class UsersRepository extends DefaultCrudRepository<
  Users,
  typeof Users.prototype.id
> {
  public readonly virtualUsers: HasManyRepositoryFactory<
    VirtualUsers,
    typeof Users.prototype.id
  >;
  public readonly dongs: HasManyRepositoryFactory<Dongs, typeof Users.prototype.id>;

  constructor(
    @inject('datasources.mongods') dataSource: MongodsDataSource,
    @repository.getter('DongsRepository')
    protected dongsRepositoryGetter: Getter<DongsRepository>,
    @repository.getter('VirtualUsersRepository')
    protected virtualUsersRepositoryGetter: Getter<VirtualUsersRepository>,
  ) {
    super(Users, dataSource);

    this.virtualUsers = this.createHasManyRepositoryFactoryFor(
      'virtualUsers',
      virtualUsersRepositoryGetter,
    );
    this.registerInclusionResolver('virtualUsers', this.virtualUsers.inclusionResolver);

    this.dongs = this.createHasManyRepositoryFactoryFor('dongs', dongsRepositoryGetter);
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);
  }
}
