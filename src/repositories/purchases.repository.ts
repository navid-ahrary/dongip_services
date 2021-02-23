import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { inject, Getter } from '@loopback/core';
import { Purchases, PurchasesRelations, Users } from '../models';
import { MariadbDataSource } from '../datasources';
import { UsersRepository } from '.';

export class PurchasesRepository extends DefaultCrudRepository<
  Purchases,
  typeof Purchases.prototype.purchaseId,
  PurchasesRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Purchases.prototype.purchaseId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Purchases, dataSource);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
