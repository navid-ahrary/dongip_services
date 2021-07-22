import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { DongsRepository, UsersRepository } from '.';
import { MariadbDataSource } from '../datasources';
import { Dongs, Scores, ScoresRelations, Users } from '../models';

export class ScoresRepository extends DefaultCrudRepository<
  Scores,
  typeof Scores.prototype.scoreId,
  ScoresRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Scores.prototype.scoreId>;

  public readonly dong: BelongsToAccessor<Dongs, typeof Scores.prototype.scoreId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('DongsRepository') protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super(Scores, dataSource);

    this.dong = this.createBelongsToAccessorFor('dong', dongsRepositoryGetter);
    this.registerInclusionResolver('dong', this.dong.inclusionResolver);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
