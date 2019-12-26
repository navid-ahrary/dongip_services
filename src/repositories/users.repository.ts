import {
  DefaultCrudRepository,
  repository,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {Users, VirtualUsers, Categories} from '../models';
import {MongoDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {VirtualUsersRepository} from './virtualUsers.repository';
import {CategoriesRepository} from './categories.repository';

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

  public readonly categories: HasManyRepositoryFactory<
    Categories,
    typeof Users.prototype.id
  >;

  constructor(
    @inject('datasources.mongods') dataSource: MongoDataSource,
    @repository.getter('VirtualUsersRepository')
    protected virtualUsersRepositoryGetter: Getter<VirtualUsersRepository>,
    @repository.getter('CategoriesRepository')
    protected categoriesRepositoryGetter: Getter<CategoriesRepository>,
  ) {
    super(Users, dataSource);

    this.categories = this.createHasManyRepositoryFactoryFor(
      'categories',
      categoriesRepositoryGetter,
    );
    this.registerInclusionResolver('categories', this.categories.inclusionResolver);

    this.virtualUsers = this.createHasManyRepositoryFactoryFor(
      'virtualUsers',
      virtualUsersRepositoryGetter,
    );
    this.registerInclusionResolver('virtualUsers', this.virtualUsers.inclusionResolver);
  }
}
