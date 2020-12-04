import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { inject, Getter } from '@loopback/core';
import { RefreshTokens, RefreshTokensRelations, Users } from '../models';
import { MysqlDataSource } from '../datasources';
import { UsersRepository } from './users.repository';

export class RefreshTokensRepository extends DefaultCrudRepository<
  RefreshTokens,
  typeof RefreshTokens.prototype.refreshId,
  RefreshTokensRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof RefreshTokens.prototype.refreshId>;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(RefreshTokens, dataSource);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
  }
}
