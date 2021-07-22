import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { UsersRepository } from '.';
import { MariadbDataSource } from '../datasources';
import { Settings, SettingsRelations, Users } from '../models';

export class SettingsRepository extends DefaultCrudRepository<
  Settings,
  typeof Settings.prototype.settingId,
  SettingsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Settings.prototype.settingId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Settings, dataSource);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
