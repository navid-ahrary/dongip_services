import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';
import {Messages, MessagesRelations, Tickets, Users} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {TicketsRepository} from './tickets.repository';
import {UsersRepository} from './users.repository';

export class MessagesRepository extends DefaultCrudRepository<
  Messages,
  typeof Messages.prototype.messageId,
  MessagesRelations
> {
  public readonly ticket: BelongsToAccessor<
    Tickets,
    typeof Messages.prototype.messageId
  >;

  public readonly user: BelongsToAccessor<
    Users,
    typeof Messages.prototype.messageId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('TicketsRepository')
    protected ticketsRepositoryGetter: Getter<TicketsRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Messages, dataSource);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
    this.ticket = this.createBelongsToAccessorFor(
      'ticket',
      ticketsRepositoryGetter,
    );
    this.registerInclusionResolver('ticket', this.ticket.inclusionResolver);
  }
}
