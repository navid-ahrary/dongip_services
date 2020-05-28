import {
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
  DefaultTransactionalRepository,
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
import {MysqlDataSource} from '../datasources';
import {
  UsersRepository,
  UsersRelsRepository,
  CategoryBillRepository,
  CategoryRepository,
} from './';

export class VirtualUsersRepository extends DefaultTransactionalRepository<
  VirtualUsers,
  typeof VirtualUsers.prototype.id,
  VirtualUsersRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users,
    typeof VirtualUsers.prototype.id
  >;

  public readonly usersRels: HasManyRepositoryFactory<
    UsersRels,
    typeof Users.prototype.id
  >;

  public readonly categories: HasManyRepositoryFactory<
    Category,
    typeof Users.prototype.id
  >;

  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill,
    typeof Users.prototype.id
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
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
}
