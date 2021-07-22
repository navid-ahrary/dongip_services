import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import { Dongs, Receipts, ReceiptsRelations, Users } from '../models';
import { DongsRepository } from './dongs.repository';
import { UsersRepository } from './users.repository';

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
