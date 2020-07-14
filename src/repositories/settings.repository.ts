import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {Settings, SettingsRelations, Users} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';

export class SettingsRepository extends DefaultCrudRepository<
  Settings,
  typeof Settings.prototype.settingId,
  SettingsRelations
> {

  public readonly user: BelongsToAccessor<Users, typeof Settings.prototype.settingId>;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource, @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Settings, dataSource);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter,);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
