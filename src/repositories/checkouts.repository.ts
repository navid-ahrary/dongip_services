import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';
import {Checkouts, CheckoutsRelations, Users} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';

export class CheckoutsRepository extends DefaultCrudRepository<
  Checkouts,
  typeof Checkouts.prototype.checkoutId,
  CheckoutsRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof Checkouts.prototype.checkoutId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Checkouts, dataSource);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
