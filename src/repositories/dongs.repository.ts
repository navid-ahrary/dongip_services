import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { Dongs, DongsRelations, Users, Category } from '../models';
import { ArangodbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { UsersRepository } from './users.repository';
import { CategoryRepository } from './category.repository';

export class DongsRepository extends DefaultCrudRepository<
  Dongs,
  typeof Dongs.prototype._key,
  DongsRelations
  > {
  public readonly users: BelongsToAccessor<Users, typeof Dongs.prototype._key>;

  public readonly category: BelongsToAccessor<Category, typeof Dongs.prototype._key>;

  constructor(
    @inject('datasources.arangodb') dataSource: ArangodbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
  ) {
    super(Dongs, dataSource);
    this.category = this.createBelongsToAccessorFor('category', categoryRepositoryGetter);
    this.registerInclusionResolver('category', this.category.inclusionResolver);

    this.users = this.createBelongsToAccessorFor(
      'expensesManager',
      usersRepositoryGetter,
    );
    this.registerInclusionResolver('users', this.users.inclusionResolver);
  }
}
