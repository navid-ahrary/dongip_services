import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { UsersRepository } from '.';
import { MariadbDataSource } from '../datasources';
import { Messages, MessagesRelations, Users } from '../models';

export class MessagesRepository extends DefaultCrudRepository<
  Messages,
  typeof Messages.prototype.messageId,
  MessagesRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Messages.prototype.messageId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Messages, dataSource);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
