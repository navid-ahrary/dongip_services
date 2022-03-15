import { belongsTo, hasMany, model, property, RelationType } from '@loopback/repository';
import { BaseEntity } from './base-entity.model';
import { Dongs } from './dongs.model';
import { Users } from './users.model';

@model({
  name: 'wallets',
  settings: {
    foreignKeys: {
      fkWalletsUserId: {
        name: 'fk_wallets_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class Wallets extends BaseEntity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
      nullable: 'N',
    },
  })
  walletId: number;

  @property({
    type: 'number',
    default: 0,
    jsonSchema: {
      type: 'number',
      minimum: 0,
    },
    mysql: {
      dataType: 'bigint unsigned',
      default: 0,
    },
  })
  initial: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: { maxLength: 255 },
    mysql: {
      columnName: 'title',
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'N',
    },
  })
  title: string;

  @property({
    type: 'string',
    jsonSchema: { maxLength: 255 },
    mysql: {
      columnName: 'desc',
      dataType: 'varchar',
      dataLength: 255,
      nullable: 'Y',
    },
  })
  desc?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 3,
      maxLength: 512,
    },
    mysql: {
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'Y',
    },
  })
  icon?: string;

  @belongsTo(
    () => Users,
    {
      source: Users,
      name: 'user',
      type: RelationType.belongsTo,
      keyFrom: 'userId',
      keyTo: 'userId',
      target: () => Wallets,
    },
    {
      type: 'number',
      required: true,
      index: { normal: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        nullable: 'N',
      },
    },
  )
  userId: number;

  @hasMany(() => Dongs, { keyTo: 'walletId' })
  dongs: Dongs[];

  @property({
    type: 'date',
    required: false,
    defaultFn: 'now',
    mysql: {
      columnName: 'updated_at',
      dataType: 'timestamp',
      default: 'now',
      nullable: 'N',
    },
  })
  updatedAt: string;

  constructor(data?: Partial<Wallets>) {
    super(data);
  }
}

export interface WalletsRelations {
  // describe navigational properties here
}

export type WalletsWithRelations = Wallets & WalletsRelations;
