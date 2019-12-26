import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {Dongs, DongsRelations, Users} from '../models';
import {MongodsDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';

export class DongsRepository extends DefaultCrudRepository<
  Dongs,
  typeof Dongs.prototype.id,
  DongsRelations
> {
  public readonly users: BelongsToAccessor<Users, typeof Users.prototype.id>;

  constructor(
    @inject('datasources.mongods') dataSource: MongodsDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Dongs, dataSource);

    this.users = this.createBelongsToAccessorFor('dongs', usersRepositoryGetter);
    this.registerInclusionResolver('dongs', this.users.inclusionResolver);
  }
}
