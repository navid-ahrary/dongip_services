import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { inject, Getter } from '@loopback/core';
import { Users, Dongs, Receiptions, ReceiptionsRelations } from '../models';
import { MariadbDataSource } from '../datasources';
import { DongsRepository, UsersRepository } from '.';

export class ReceiptionsRepository extends DefaultCrudRepository<
  Receiptions,
  typeof Receiptions.prototype.receiptionId,
  ReceiptionsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Receiptions.prototype.receiptionId>;

  public readonly dong: BelongsToAccessor<Dongs, typeof Receiptions.prototype.receiptionId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super(Receiptions, dataSource);

    this.dong = this.createBelongsToAccessorFor('dong', dongsRepositoryGetter);
    this.registerInclusionResolver('dong', this.dong.inclusionResolver);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
