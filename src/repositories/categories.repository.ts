import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {Categories, CategoriesRelations, Users} from '../models';
import {MongodsDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';

export class CategoriesRepository extends DefaultCrudRepository<
  Categories,
  typeof Categories.prototype.id,
  CategoriesRelations
> {
  public readonly users: BelongsToAccessor<Users, typeof Categories.prototype.id>;

  constructor(
    @inject('datasources.mongods') dataSource: MongodsDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Categories, dataSource);
    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
  }
}
