import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { UsersRelsRepository, UsersRepository } from '.';
import { MariadbDataSource } from '../datasources';
import { Users, UsersRels, VirtualUsers, VirtualUsersRelations } from '../models';

export class VirtualUsersRepository extends DefaultCrudRepository<
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
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
  ) {
    super(VirtualUsers, dataSource);

    this.belongsToUserRel = this.createBelongsToAccessorFor(
      'belongsToUserRel',
      usersRelsRepositoryGetter,
    );
    this.registerInclusionResolver('belongsToUserRel', this.belongsToUserRel.inclusionResolver);

    this.belongsToUser = this.createBelongsToAccessorFor('belongsToUser', usersRepositoryGetter);
    this.registerInclusionResolver('belongsToUser', this.belongsToUser.inclusionResolver);
  }
}
