import {
  repository,
  BelongsToAccessor,
  DefaultTransactionalRepository,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {VirtualUsers, VirtualUsersRelations, Users, UsersRels} from '../models';
import {MysqlDataSource} from '../datasources';
import {UsersRepository} from './';
import {UsersRelsRepository} from './users-rels.repository';

export class VirtualUsersRepository extends DefaultTransactionalRepository<
  VirtualUsers,
  typeof VirtualUsers.prototype.virtualUserId,
  VirtualUsersRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users,
    typeof VirtualUsers.prototype.virtualUserId
  >;

  public readonly belongsToUserRel: BelongsToAccessor<
    UsersRels,
    typeof VirtualUsers.prototype.virtualUserId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
  ) {
    super(VirtualUsers, dataSource);
    this.belongsToUserRel = this.createBelongsToAccessorFor(
      'belongsToUserRel',
      usersRelsRepositoryGetter,
    );
    this.registerInclusionResolver(
      'belongsToUserRel',
      this.belongsToUserRel.inclusionResolver,
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
