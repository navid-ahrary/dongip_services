import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {MysqlDataSource} from '../datasources';
import {Dong, DongRelations, Users, CategoryBill} from '../models';
import {UsersRepository, CategoryRepository} from '.';
import {CategoryBillRepository} from './category-bill.repository';

export class DongRepository extends DefaultCrudRepository<
  Dong,
  typeof Dong.prototype.id,
  DongRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users,
    typeof Dong.prototype.id
  >;

  public readonly categoryBills: HasManyRepositoryFactory<
    CategoryBill,
    typeof Dong.prototype.id
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
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
}
