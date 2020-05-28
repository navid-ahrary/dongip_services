import {
  repository,
  BelongsToAccessor,
  DefaultTransactionalRepository,
} from '@loopback/repository';
import {
  CategoryBill,
  CategoryBillRelations,
  Category,
  Dong,
  Users,
  UsersRels,
} from '../models';
import {MysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {CategoryRepository} from './category.repository';
import {DongRepository} from './dong.repository';
import {UsersRepository} from './users.repository';
import {UsersRelsRepository} from './users-rels.repository';

export class CategoryBillRepository extends DefaultTransactionalRepository<
  CategoryBill,
  typeof CategoryBill.prototype.id,
  CategoryBillRelations
> {
  public readonly belongsToCategory: BelongsToAccessor<
    Category,
    typeof CategoryBill.prototype.id
  >;

  public readonly belongsToDong: BelongsToAccessor<
    Dong,
    typeof CategoryBill.prototype.id
  >;

  public readonly belongsToUser: BelongsToAccessor<
    Users,
    typeof CategoryBill.prototype.id
  >;

  public readonly belongsToUserRel: BelongsToAccessor<
    UsersRels,
    typeof CategoryBill.prototype.id
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter('DongRepository')
    protected dongRepositoryGetter: Getter<DongRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
  ) {
    super(CategoryBill, dataSource);
    this.belongsToUserRel = this.createBelongsToAccessorFor(
      'belongsToUserRel',
      usersRelsRepositoryGetter,
    );
    this.registerInclusionResolver(
      'belongsToUserRel',
      this.belongsToUserRel.inclusionResolver,
    );

    this.belongsToUser = this.createBelongsToAccessorFor(
      'belongsToUser',
      usersRepositoryGetter,
    );
    this.registerInclusionResolver(
      'belongsToUser',
      this.belongsToUser.inclusionResolver,
    );

    this.belongsToDong = this.createBelongsToAccessorFor(
      'belongsToDong',
      dongRepositoryGetter,
    );
    this.registerInclusionResolver(
      'belongsToDong',
      this.belongsToDong.inclusionResolver,
    );

    this.belongsToCategory = this.createBelongsToAccessorFor(
      'belongsToCategory',
      categoryRepositoryGetter,
    );
    this.registerInclusionResolver(
      'belongsToCategory',
      this.belongsToCategory.inclusionResolver,
    );
  }

  /**
   * override super class's create method
   */
  // public async create(entity: DataObject<CategoryBill>): Promise<CategoryBill> {
  //   const categoryBill = await super.create(entity);
  //   categoryBill._id = categoryBill._key[1];
  //   categoryBill._key = categoryBill._key[0];
  //   return categoryBill;
  // }
}
