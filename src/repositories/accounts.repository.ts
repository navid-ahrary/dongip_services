import { Getter, inject } from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository,
} from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import { Accounts, AccountsRelations, Dongs, Users } from '../models';
import { DongsRepository } from './dongs.repository';
import { UsersRepository } from './users.repository';

export class AccountsRepository extends DefaultCrudRepository<
  Accounts,
  typeof Accounts.prototype.accountId,
  AccountsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Accounts.prototype.accountId>;

  public readonly dongs: HasManyRepositoryFactory<Dongs, typeof Accounts.prototype.accountId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super(Accounts, dataSource);
    this.dongs = this.createHasManyRepositoryFactoryFor('dongs', dongsRepositoryGetter);
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
  }
}
