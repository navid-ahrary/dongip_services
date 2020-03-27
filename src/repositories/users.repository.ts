import {
  DefaultCrudRepository,
  repository,
  HasManyRepositoryFactory,
  DataObject,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {ArangodbDataSource} from '../datasources';
import {PasswordHasher} from '../services';
import {
  VirtualUsersRepository,
  DongsRepository,
  CategoryBillRepository,
  CategoryRepository,
  UsersRelsRepository,
} from './';
import {PasswordHasherBindings} from '../keys';
import {
  Users,
  VirtualUsers,
  Dongs,
  Category,
  UsersRels,
  CategoryBill,
} from '../models';

export class UsersRepository extends DefaultCrudRepository<
  Users,
  typeof Users.prototype._key
> {
  public readonly virtualUsers: HasManyRepositoryFactory<
    VirtualUsers,
    typeof Users.prototype._id
  >;

  public readonly dongs: HasManyRepositoryFactory<
    Dongs,
    typeof Users.prototype._id
  >;

  public readonly categories: HasManyRepositoryFactory<
    Category,
    typeof Users.prototype._id
  >;

  public readonly usersRels: HasManyRepositoryFactory<
    UsersRels,
    typeof Users.prototype._id
  >;

  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill,
    typeof Users.prototype._id
  >;

  constructor(
    @inject('datasources.arangodb') dataSource: ArangodbDataSource,
    @repository.getter('VirtualUsersRepository')
    protected virtualUsersRepositoryGetter: Getter<VirtualUsersRepository>,
    @repository.getter('DongsRepository')
    protected dongsRepositoryGetter: Getter<DongsRepository>,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
    @repository.getter('CategoryBillRepository')
    protected categoryBillRepositoryGetter: Getter<CategoryBillRepository>,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
  ) {
    super(Users, dataSource);
    this.categoryBills = this.createHasManyRepositoryFactoryFor(
      'categoryBills',
      categoryBillRepositoryGetter,
    );
    this.registerInclusionResolver(
      'categoryBills',
      this.categoryBills.inclusionResolver,
    );

    this.usersRels = this.createHasManyRepositoryFactoryFor(
      'usersRels',
      usersRelsRepositoryGetter,
    );
    this.registerInclusionResolver(
      'usersRels',
      this.usersRels.inclusionResolver,
    );

    this.categories = this.createHasManyRepositoryFactoryFor(
      'categories',
      categoryRepositoryGetter,
    );
    this.registerInclusionResolver(
      'categories',
      this.categories.inclusionResolver,
    );

    this.dongs = this.createHasManyRepositoryFactoryFor(
      'dongs',
      dongsRepositoryGetter,
    );
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);

    this.virtualUsers = this.createHasManyRepositoryFactoryFor(
      'virtualUsers',
      virtualUsersRepositoryGetter,
    );
    this.registerInclusionResolver(
      'virtualUsers',
      this.virtualUsers.inclusionResolver,
    );
  }

  /**
   * override super class's create method
   */
  public async create(entity: DataObject<Users>): Promise<Users> {
    const user = await super.create(entity);
    user._id = user._key[1];
    user._key = user._key[0];
    return user;
  }
}
