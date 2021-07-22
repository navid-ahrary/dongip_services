import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { UsersRepository } from '.';
import { MariadbDataSource } from '../datasources';
import { RefreshTokens, RefreshTokensRelations, Users } from '../models';

export class RefreshTokensRepository extends DefaultCrudRepository<
  RefreshTokens,
  typeof RefreshTokens.prototype.refreshId,
  RefreshTokensRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof RefreshTokens.prototype.refreshId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(RefreshTokens, dataSource);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
  }
}
