import {
  repository,
  BelongsToAccessor,
  HasManyRepositoryFactory,
  DefaultTransactionalRepository,
} from '@loopback/repository';
import {
  Groups,
  GroupsRelations,
  Users,
  Dongs,
  BillList,
  PayerList,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UsersRepository} from './users.repository';
import {DongsRepository} from './dongs.repository';
import {BillListRepository} from './bill-list.repository';
import {PayerListRepository} from './payer-list.repository';

export class GroupsRepository extends DefaultTransactionalRepository<
  Groups,
  typeof Groups.prototype.groupId,
  GroupsRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof Groups.prototype.groupId
  >;

  public readonly dongs: HasManyRepositoryFactory<
    Dongs,
    typeof Groups.prototype.groupId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('DongsRepository')
    protected dongsRepositoryGetter: Getter<DongsRepository>,
  ) {
    super(Groups, dataSource);

    this.dongs = this.createHasManyRepositoryFactoryFor(
      'dongs',
      dongsRepositoryGetter,
    );
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}