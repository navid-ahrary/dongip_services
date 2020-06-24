import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';
import {Tickets, TicketsRelations, Users} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';

export class TicketsRepository extends DefaultCrudRepository<
  Tickets,
  typeof Tickets.prototype.ticketId,
  TicketsRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof Tickets.prototype.ticketId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Tickets, dataSource);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
  }
}
