import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {VirtualUsers, VirtualUsersRelations, Users, Dongs} from '../models';
import {MongodsDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';
import {DongsRepository} from './dongs.repository';

export class VirtualUsersRepository extends DefaultCrudRepository<
  VirtualUsers,
  typeof VirtualUsers.prototype.id,
  VirtualUsersRelations
> {
  public readonly users: BelongsToAccessor<Users, typeof VirtualUsers.prototype.id>;
  public readonly dongs: HasManyRepositoryFactory<
    Dongs,
    typeof VirtualUsers.prototype.id
  >;

  constructor(
    @inject('datasources.mongods') dataSource: MongodsDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('DongsRepository')
    protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super(VirtualUsers, dataSource);

    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
    this.dongs = this.createHasManyRepositoryFactoryFor('dongs', dongsRepositoryGetter);

    this.registerInclusionResolver('users', this.users.inclusionResolver);
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);
  }
}
