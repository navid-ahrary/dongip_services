import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { UsersRels, UsersRelsRelations, Users } from '../models';
import { ArangodbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { UsersRepository } from './users.repository';

export class UsersRelsRepository extends DefaultCrudRepository<
  UsersRels,
  typeof UsersRels.prototype._key,
  UsersRelsRelations
  > {

  public readonly users: BelongsToAccessor<Users, typeof UsersRels.prototype._key>;

  constructor(
    @inject('datasources.arangodb') dataSource: ArangodbDataSource, @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(UsersRels, dataSource);
    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
    this.registerInclusionResolver('users', this.users.inclusionResolver);
  }
}
