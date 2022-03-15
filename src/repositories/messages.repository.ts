import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import { Accounts, Messages, MessagesRelations, Users } from '../models';
import { AccountsRepository } from './accounts.repository';
import { UsersRepository } from './users.repository';

export class MessagesRepository extends DefaultCrudRepository<
  Messages,
  typeof Messages.prototype.messageId,
  MessagesRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Messages.prototype.messageId>;

  public readonly account: BelongsToAccessor<Accounts, typeof Messages.prototype.messageId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('AccountsRepository')
    protected accountsRepositoryGetter: Getter<AccountsRepository>,
  ) {
    super(Messages, dataSource);
    this.account = this.createBelongsToAccessorFor('account', accountsRepositoryGetter);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
