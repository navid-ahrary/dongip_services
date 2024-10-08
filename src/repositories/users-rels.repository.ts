import { Getter, inject } from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository,
} from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import { BillList, Budgets, PayerList, Users, UsersRels, UsersRelsRelations } from '../models';
import { BillListRepository } from './bill-list.repository';
import { BudgetsRepository } from './budgets.repository';
import { PayerListRepository } from './payer-list.repository';
import { UsersRepository } from './users.repository';

export class UsersRelsRepository extends DefaultCrudRepository<
  UsersRels,
  typeof UsersRels.prototype.userRelId,
  UsersRelsRelations
> {
  public readonly belongsToUser: BelongsToAccessor<Users, typeof UsersRels.prototype.userRelId>;

  public readonly budgets: HasManyRepositoryFactory<Budgets, typeof UsersRels.prototype.userRelId>;

  public readonly mutualUserRel: BelongsToAccessor<UsersRels, typeof UsersRels.prototype.userRelId>;

  public readonly billLists: HasManyRepositoryFactory<
    BillList,
    typeof UsersRels.prototype.userRelId
  >;

  public readonly payerLists: HasManyRepositoryFactory<
    PayerList,
    typeof UsersRels.prototype.userRelId
  >;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('BudgetsRepository')
    protected budgetsRepositoryGetter: Getter<BudgetsRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
    @repository.getter('BillListRepository')
    protected billListRepositoryGetter: Getter<BillListRepository>,
    @repository.getter('PayerListRepository')
    protected payerListRepositoryGetter: Getter<PayerListRepository>,
  ) {
    super(UsersRels, dataSource);

    this.payerLists = this.createHasManyRepositoryFactoryFor(
      'payerLists',
      payerListRepositoryGetter,
    );
    this.registerInclusionResolver('payerLists', this.payerLists.inclusionResolver);

    this.billLists = this.createHasManyRepositoryFactoryFor('billLists', billListRepositoryGetter);
    this.registerInclusionResolver('billLists', this.billLists.inclusionResolver);

    this.mutualUserRel = this.createBelongsToAccessorFor(
      'mutualUserRel',
      usersRelsRepositoryGetter,
    );
    this.registerInclusionResolver('mutualUserRel', this.mutualUserRel.inclusionResolver);

    this.budgets = this.createHasManyRepositoryFactoryFor('budgets', budgetsRepositoryGetter);
    this.registerInclusionResolver('budgets', this.budgets.inclusionResolver);

    this.belongsToUser = this.createBelongsToAccessorFor('belongsToUser', usersRepositoryGetter);
    this.registerInclusionResolver('belongsToUser', this.belongsToUser.inclusionResolver);
  }
}
