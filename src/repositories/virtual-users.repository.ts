import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  DataObject,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {
  VirtualUsers,
  VirtualUsersRelations,
  Users,
  UsersRels,
  Category,
  CategoryBill,
} from '../models';
import {ArangodbDataSource} from '../datasources';
import {
  UsersRepository,
  UsersRelsRepository,
  CategoryBillRepository,
  CategoryRepository,
} from './';

export class VirtualUsersRepository extends DefaultCrudRepository<
  VirtualUsers,
  typeof VirtualUsers.prototype._key,
  VirtualUsersRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users,
    typeof VirtualUsers.prototype._id
  >;

  public readonly usersRels: HasManyRepositoryFactory<
    UsersRels,
    typeof Users.prototype._id
  >;

  public readonly categories: HasManyRepositoryFactory<
    Category,
    typeof Users.prototype._id
  >;

  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill,
    typeof Users.prototype._id
  >;

  constructor(
    @inject('datasources.arangodb') dataSource: ArangodbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('DongRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
    @repository.getter('CategoryBillRepository')
    protected categoryBillRepositoryGetter: Getter<CategoryBillRepository>,
  ) {
    super(VirtualUsers, dataSource);

    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser',
      usersRepositoryGetter,
    );

    this.categories = this.createHasManyRepositoryFactoryFor(
      'categories',
      categoryRepositoryGetter,
    );
    this.registerInclusionResolver(
      'categories',
      this.categories.inclusionResolver,
    );

    this.usersRels = this.createHasManyRepositoryFactoryFor(
      'usersRels',
      usersRelsRepositoryGetter,
    );
    this.registerInclusionResolver(
      'usersRels',
      this.usersRels.inclusionResolver,
    );
  }

  /**
   * create model like a human being
   */
  public async create(entity: DataObject<VirtualUsers>): Promise<VirtualUsers> {
    const virtualUser = await super.create(entity);
    virtualUser._id = virtualUser._key[1];
    virtualUser._key = virtualUser._key[0];
    return virtualUser;
  }
}
