import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import { Accounts, AccountsRelations, Users } from '../models';
import { UsersRepository } from './users.repository';

export class AccountsRepository extends DefaultCrudRepository<
  Accounts,
  typeof Accounts.prototype.accountId,
  AccountsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Accounts.prototype.accountId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Accounts, dataSource);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
  }
}
