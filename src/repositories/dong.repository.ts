import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  DataObject,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {ArangodbDataSource} from '../datasources';
import {Dong, DongRelations, Users, CategoryBill} from '../models';
import {UsersRepository, CategoryRepository} from '.';
import {CategoryBillRepository} from './category-bill.repository';

export class DongRepository extends DefaultCrudRepository<
  Dong,
  typeof Dong.prototype._key,
  DongRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users,
    typeof Dong.prototype._id
  >;

  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill,
    typeof Dong.prototype._key
  >;

  constructor(
    @inject('datasources.arangodb') dataSource: ArangodbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter('CategoryBillRepository')
    protected categoryBillRepositoryGetter: Getter<CategoryBillRepository>,
  ) {
    super(Dong, dataSource);
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
      usersRepositoryGetter,
    );
    this.registerInclusionResolver(
      'belongsToUser',
      this.belongsToUser.inclusionResolver,
    );
  }

  /**
   * override super class's create method
   */
  public async create(entity: DataObject<Dong>): Promise<Dong> {
    const dong = await super.create(entity);
    dong._id = dong._key[1];
    dong._key = dong._key[0];
    return dong;
  }
}
