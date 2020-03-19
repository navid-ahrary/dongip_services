import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  DataObject,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {
  UsersRels,
  UsersRelsRelations,
  Users,
  CategoryBill,
  VirtualUsers,
} from '../models';
import {ArangodbDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {
  UsersRepository,
  CategoryBillRepository,
  VirtualUsersRepository,
} from './';

export class UsersRelsRepository extends DefaultCrudRepository<
  UsersRels,
  typeof UsersRels.prototype._key,
  UsersRelsRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users | VirtualUsers,
    typeof UsersRels.prototype._id
  >;

  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill,
    typeof UsersRels.prototype._key
  >;

  constructor(
    @inject('datasources.arangodb') dataSource: ArangodbDataSource,
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

  /**
   * override create method
   */
  public async create(entity: DataObject<UsersRels>): Promise<UsersRels> {
    const result = await super.create(entity);
    result._id = result._key[1];
    result._key = result._key[0];
    return result;
  }
}
