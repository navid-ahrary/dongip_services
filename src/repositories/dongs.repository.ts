import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {Dongs, DongsRelations, Users, VirtualUsers} from '../models';
import {MongodsDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';
import {VirtualUsersRepository} from './virtual-users.repository';

export class DongsRepository extends DefaultCrudRepository<
  Dongs,
  typeof Dongs.prototype.id,
  DongsRelations
> {
  public readonly users: BelongsToAccessor<Users, typeof Dongs.prototype.id>;

  public readonly virtualUsers: BelongsToAccessor<
    VirtualUsers,
    typeof Dongs.prototype.id
  >;

  constructor(
    @inject('datasources.mongods') dataSource: MongodsDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('VirtualUsersRepository')
    protected virtualUsersRepositoryGetter: Getter<VirtualUsersRepository>,
  ) {
    super(Dongs, dataSource);
    this.virtualUsers = this.createBelongsToAccessorFor(
      'virtualUsers',
      virtualUsersRepositoryGetter,
    );
    this.registerInclusionResolver('virtualUsers', this.virtualUsers.inclusionResolver);

    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
    this.registerInclusionResolver('users', this.users.inclusionResolver);
  }
}
