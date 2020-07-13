import {
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
  DefaultCrudRepository,
} from '@loopback/repository';
import {Groups, GroupsRelations, Users, Dongs, Budgets} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';
import {DongsRepository} from './dongs.repository';
import {BudgetsRepository} from './budgets.repository';

export class GroupsRepository extends DefaultCrudRepository<
  Groups,
  typeof Groups.prototype.groupId,
  GroupsRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof Groups.prototype.groupId
  >;

  public readonly dongs: HasManyRepositoryFactory<
    Dongs,
    typeof Groups.prototype.groupId
  >;

  public readonly budgets: HasManyRepositoryFactory<Budgets, typeof Groups.prototype.groupId>;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('DongsRepository')
    protected dongsRepositoryGetter: Getter<DongsRepository>, @repository.getter('BudgetsRepository') protected budgetsRepositoryGetter: Getter<BudgetsRepository>,
  ) {
    super(Groups, dataSource);
    this.budgets = this.createHasManyRepositoryFactoryFor('budgets', budgetsRepositoryGetter,);
    this.registerInclusionResolver('budgets', this.budgets.inclusionResolver);

    this.dongs = this.createHasManyRepositoryFactoryFor(
      'dongs',
      dongsRepositoryGetter,
    );
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
