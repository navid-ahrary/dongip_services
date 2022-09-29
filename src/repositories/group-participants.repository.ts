import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import { GroupParticipants, GroupParticipantsRelations, Groups, Users } from '../models';
import { GroupsRepository } from './groups.repository';
import { UsersRepository } from './users.repository';

export class GroupParticipantsRepository extends DefaultCrudRepository<
  GroupParticipants,
  typeof GroupParticipants.prototype.groupParticipantId,
  GroupParticipantsRelations
> {
  public readonly group: BelongsToAccessor<
    Groups,
    typeof GroupParticipants.prototype.groupParticipantId
  >;

  public readonly user: BelongsToAccessor<
    Users,
    typeof GroupParticipants.prototype.groupParticipantId
  >;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('GroupsRepository')
    protected groupsRepositoryGetter: Getter<GroupsRepository>,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(GroupParticipants, dataSource);
    // this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);

    this.group = this.createBelongsToAccessorFor('group', groupsRepositoryGetter);
  }
}
