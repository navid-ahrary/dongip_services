import {
  DefaultCrudRepository,
  repository,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import { Users, VirtualUsers, Dongs, Category, UsersRels } from '../models';
import { ArangodbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { VirtualUsersRepository } from './virtual-users.repository';
import { DongsRepository } from './dongs.repository';
import { CategoryRepository } from './category.repository';
import { UsersRelsRepository } from './users-rels.repository';

export class UsersRepository extends DefaultCrudRepository<
  Users,
  typeof Users.prototype._key
  > {
  public readonly virtualUsers: HasManyRepositoryFactory<
    VirtualUsers,
    typeof Users.prototype._key
  >;

  public readonly dongs: HasManyRepositoryFactory<Dongs, typeof Users.prototype._key>;

  public readonly categories: HasManyRepositoryFactory<
    Category,
    typeof Users.prototype._key
  >;

  public readonly usersRels: HasManyRepositoryFactory<UsersRels, typeof Users.prototype._key>;

  constructor(
    @inject('datasources.arangodb') dataSource: ArangodbDataSource,
    @repository.getter('VirtualUsersRepository')
    protected virtualUsersRepositoryGetter: Getter<VirtualUsersRepository>,
    @repository.getter('DongsRepository')
    protected dongsRepositoryGetter: Getter<DongsRepository>,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>, @repository.getter('UsersRelsRepository') protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
  ) {
    super(Users, dataSource);
    this.usersRels = this.createHasManyRepositoryFactoryFor('usersRels', usersRelsRepositoryGetter);
    this.registerInclusionResolver('usersRels', this.usersRels.inclusionResolver);
    this.categories = this.createHasManyRepositoryFactoryFor(
      'categories',
      categoryRepositoryGetter,
    );
    this.registerInclusionResolver('categories', this.categories.inclusionResolver);
    this.dongs = this.createHasManyRepositoryFactoryFor('dongs', dongsRepositoryGetter);
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);

    this.virtualUsers = this.createHasManyRepositoryFactoryFor(
      'virtualUsers',
      virtualUsersRepositoryGetter,
    );
    this.registerInclusionResolver('virtualUsers', this.virtualUsers.inclusionResolver);
  }
}
