import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
  DataObject,
} from '@loopback/repository';
import {inject, Getter} from '@loopback/core';

import {ArangodbDataSource} from '../datasources';
import {Dongs, DongsRelations, Users} from '../models';
import {UsersRepository, CategoryRepository} from './';

export class DongsRepository extends DefaultCrudRepository<
  Dongs,
  typeof Dongs.prototype._key,
  DongsRelations
> {
  public readonly belongsToUser: BelongsToAccessor<
    Users,
    typeof Dongs.prototype._id
  >;

  constructor(
    @inject('datasources.arangodb') dataSource: ArangodbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
  ) {
    super(Dongs, dataSource);

    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser',
      usersRepositoryGetter,
    );
  }

  /**
   * override super class's create method
   */
  public async create(entity: DataObject<Dongs>): Promise<Dongs> {
    const dong = await super.create(entity);
    dong._id = dong._key[1];
    dong._key = dong._key[0];
    return dong;
  }
}
