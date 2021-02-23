import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { inject, Getter } from '@loopback/core';
import { Scores, ScoresRelations, Users, Dongs } from '../models';
import { MariadbDataSource } from '../datasources';
import { DongsRepository, UsersRepository } from '.';

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
