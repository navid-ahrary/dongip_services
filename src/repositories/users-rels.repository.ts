import {
  repository,
  BelongsToAccessor,
  DefaultTransactionalRepository,
} from '@loopback/repository';
import {UsersRels, UsersRelsRelations, Users, VirtualUsers} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './';
import {VirtualUsersRepository} from './virtual-users.repository';

export class UsersRelsRepository extends DefaultTransactionalRepository<
  UsersRels,
  typeof UsersRels.prototype.userRelId,
  UsersRelsRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users,
    typeof UsersRels.prototype.userRelId
  >;

  public readonly belongsToVirtualUser: BelongsToAccessor<
    VirtualUsers,
    typeof UsersRels.prototype.userRelId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('VirtualUsersRepository')
    protected virtualUsersRepositoryGetter: Getter<VirtualUsersRepository>,
  ) {
    super(UsersRels, dataSource);

    this.belongsToVirtualUser = this.createBelongsToAccessorFor(
      'belongsToVirtualUser',
      virtualUsersRepositoryGetter,
    );
    this.registerInclusionResolver(
      'belongsToVirtualUser',
      this.belongsToVirtualUser.inclusionResolver,
    );

    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser',
      usersRepositoryGetter,
    );
    this.registerInclusionResolver(
      'belongsToUser',
      this.belongsToUser.inclusionResolver,
    );
  }
}
