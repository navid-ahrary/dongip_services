import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';
import {Scores, ScoresRelations, Users, Dongs} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';
import {DongsRepository} from './dongs.repository';

export class ScoresRepository extends DefaultCrudRepository<
  Scores,
  typeof Scores.prototype.scoreId,
  ScoresRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof Scores.prototype.scoreId
  >;

  public readonly dong: BelongsToAccessor<
    Dongs,
    typeof Scores.prototype.scoreId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('DongsRepository')
    protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super(Scores, dataSource);
    this.dong = this.createBelongsToAccessorFor('dong', dongsRepositoryGetter);
    this.registerInclusionResolver('dong', this.dong.inclusionResolver);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
