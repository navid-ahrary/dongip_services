import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
} from '@loopback/repository';
import {Tickets, TicketsRelations, Users, Messages} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';
import {MessagesRepository} from './messages.repository';

export class TicketsRepository extends DefaultCrudRepository<
  Tickets,
  typeof Tickets.prototype.ticketId,
  TicketsRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof Tickets.prototype.ticketId
  >;

  public readonly messages: HasManyRepositoryFactory<
    Messages,
    typeof Tickets.prototype.ticketId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('MessagesRepository')
    protected messagesRepositoryGetter: Getter<MessagesRepository>,
  ) {
    super(Tickets, dataSource);
    this.messages = this.createHasManyRepositoryFactoryFor(
      'messages',
      messagesRepositoryGetter,
    );
    this.registerInclusionResolver('messages', this.messages.inclusionResolver);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
  }
}
