import { belongsTo, model, property, RelationType } from '@loopback/repository';
import { BaseEntity } from './base-entity.model';
import { Users } from './users.model';

@model({
  name: 'refresh_tokens',
  settings: { mysql: { engine: 'aria' } },
})
export class RefreshTokens extends BaseEntity {
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

  constructor(data?: Partial<RefreshTokens>) {
    super(data);
  }
}

export interface RefreshTokensRelations {}

export type RefereshTokensWithRelations = RefreshTokens & RefreshTokensRelations;
