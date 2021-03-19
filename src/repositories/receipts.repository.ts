import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { inject, Getter } from '@loopback/core';
import { Users, Dongs, Receipts, ReceiptsRelations } from '../models';
import { MariadbDataSource } from '../datasources';
import { DongsRepository, UsersRepository } from '.';

export class ReceiptsRepository extends DefaultCrudRepository<
  Receipts,
  typeof Receipts.prototype.receiptId,
  ReceiptsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Receipts.prototype.receiptId>;

  public readonly dong: BelongsToAccessor<Dongs, typeof Receipts.prototype.receiptId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super(Receipts, dataSource);

    this.dong = this.createBelongsToAccessorFor('dong', dongsRepositoryGetter);
    this.registerInclusionResolver('dong', this.dong.inclusionResolver);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
