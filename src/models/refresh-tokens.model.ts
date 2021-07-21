import { Entity, model, property, belongsTo, RelationType } from '@loopback/repository';
import { Users } from './users.model';

@model({
  name: 'refresh_tokens',
  settings: {
    scope: {
      where: { deleted: false },
    },
    mysql: { engine: 'aria' },
  },
})
export class RefreshTokens extends Entity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
    },
  })
  refreshId: number;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'refresh_token',
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'N',
    },
  })
  refreshToken: string;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      type: RelationType.belongsTo,
      source: Users,
      target: () => RefreshTokens,
    },
    {
      type: 'number',
      required: true,
      index: { unique: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        nullable: 'N',
      },
    },
  )
  userId: number;

  @property({
    type: 'date',
    required: false,
    defaultFn: 'now',
    mysql: {
      columnName: 'created_at',
      dataType: 'datetime',
      default: 'now',
      nullable: 'N',
    },
  })
  createdAt: string;

  @property({
    type: 'boolean',
    default: false,
    required: true,
    hidden: true,
    mysql: {
      dataType: 'tinyint',
      dataLength: 1,
      default: 0,
      nullable: 'N',
    },
  })
  deleted: boolean;

  constructor(data?: Partial<RefreshTokens>) {
    super(data);
  }
}

export interface RefreshTokensRelations {}

export type RefereshTokensWithRelations = RefreshTokens & RefreshTokensRelations;
