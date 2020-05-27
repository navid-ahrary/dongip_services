import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {
  UsersRels,
  UsersRelsRelations,
  Users,
  CategoryBill,
  VirtualUsers,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {
  UsersRepository,
  CategoryBillRepository,
  VirtualUsersRepository,
} from './';

export class UsersRelsRepository extends DefaultCrudRepository<
  UsersRels,
  typeof UsersRels.prototype.id,
  UsersRelsRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users | VirtualUsers,
    typeof UsersRels.prototype.id
  >;

  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill,
    typeof UsersRels.prototype.id
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('VirtualUsersRepository')
    protected virtualUsersRepositoryGetter: Getter<VirtualUsersRepository>,
    @repository.getter('CategoryBillRepository')
    protected categoryBillRepositoryGetter: Getter<CategoryBillRepository>,
  ) {
    super(UsersRels, dataSource);
    this.categoryBills = this.createHasManyRepositoryFactoryFor(
      'categoryBills',
      categoryBillRepositoryGetter,
    );
    this.registerInclusionResolver(
      'categoryBills',
      this.categoryBills.inclusionResolver,
    );

    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser',
      usersRepositoryGetter || virtualUsersRepositoryGetter,
    );
  }
}
