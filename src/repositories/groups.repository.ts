import { Getter, inject } from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository,
} from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import { GroupParticipants, Groups, GroupsRelations, Users } from '../models';
import { GroupParticipantsRepository } from './group-participants.repository';
import { UsersRepository } from './users.repository';

export class GroupsRepository extends DefaultCrudRepository<
  Groups,
  typeof Groups.prototype.groupId,
  GroupsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Groups.prototype.groupId>;

  public readonly groupParticipants: HasManyRepositoryFactory<
    GroupParticipants,
    typeof Groups.prototype.groupId
  >;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('GroupParticipantsRepository')
    protected groupParticipantsRepositoryGetter: Getter<GroupParticipantsRepository>,
  ) {
    super(Groups, dataSource);

    this.groupParticipants = this.createHasManyRepositoryFactoryFor(
      'groupParticipants',
      groupParticipantsRepositoryGetter,
    );
    this.registerInclusionResolver('groupParticipants', this.groupParticipants.inclusionResolver);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
  }
}
