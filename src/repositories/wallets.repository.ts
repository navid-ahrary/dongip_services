import { inject, Getter } from '@loopback/core';
import { DefaultCrudRepository, repository, BelongsToAccessor, HasManyRepositoryFactory} from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import { Wallets, WalletsRelations, Users, Dongs} from '../models';
import { UsersRepository } from './users.repository';
import {DongsRepository} from './dongs.repository';

export class WalletsRepository extends DefaultCrudRepository<
  Wallets,
  typeof Wallets.prototype.walletId,
  WalletsRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Wallets.prototype.walletId>;

  public readonly dongs: HasManyRepositoryFactory<Dongs, typeof Wallets.prototype.walletId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>, @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super(Wallets, dataSource);
    this.dongs = this.createHasManyRepositoryFactoryFor('dongs', dongsRepositoryGetter,);
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
  }
}
