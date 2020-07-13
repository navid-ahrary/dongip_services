import {
  repository,
  BelongsToAccessor,
  HasOneRepositoryFactory,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {
  UsersRels,
  UsersRelsRelations,
  Users,
  VirtualUsers,
  Budgets,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './';
import {VirtualUsersRepository} from './virtual-users.repository';
import {BudgetsRepository} from './budgets.repository';

export class UsersRelsRepository extends DefaultCrudRepository<
  UsersRels,
  typeof UsersRels.prototype.userRelId,
  UsersRelsRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users,
    typeof UsersRels.prototype.userRelId
  >;

  public readonly hasOneVirtualUser: HasOneRepositoryFactory<
    VirtualUsers,
    typeof UsersRels.prototype.userRelId
  >;

  public readonly budgets: HasManyRepositoryFactory<
    Budgets,
    typeof UsersRels.prototype.userRelId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('VirtualUsersRepository')
    protected virtualUsersRepositoryGetter: Getter<VirtualUsersRepository>,
    @repository.getter('BudgetsRepository')
    protected budgetsRepositoryGetter: Getter<BudgetsRepository>,
  ) {
    super(UsersRels, dataSource);
    this.budgets = this.createHasManyRepositoryFactoryFor(
      'budgets',
      budgetsRepositoryGetter,
    );
    this.registerInclusionResolver('budgets', this.budgets.inclusionResolver);
    this.hasOneVirtualUser = this.createHasOneRepositoryFactoryFor(
      'hasOneVirtualUser',
      virtualUsersRepositoryGetter,
    );
    this.registerInclusionResolver(
      'hasOneVirtualUser',
      this.hasOneVirtualUser.inclusionResolver,
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
