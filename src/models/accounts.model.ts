import { belongsTo, hasMany, model, property, RelationType } from '@loopback/repository';
import { BaseEntity } from './base-entity.model';
import { Dongs } from './dongs.model';
import { Users } from './users.model';

@model({
  name: 'accounts',
  settings: {
    foreignKeys: {
      fkAccountUserId: {
        name: 'fk_account_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class Accounts extends BaseEntity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'mediumint unsigned',
      nullable: 'N',
    },
  })
  accountId: number;

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
    required: true,
    jsonSchema: {
      minLength: 3,
      maxLength: 512,
    },
    mysql: {
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'N',
    },
  })
  icon: string;

  @property({
    type: 'string',
    mysql: {
      dataLength: '100',
      dataType: 'varchar',
      nullable: 'Y',
    },
  })
  description?: string;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      type: RelationType.belongsTo,
      source: Users,
      target: () => Accounts,
    },
    {
      type: 'number',
      required: true,
      index: { normal: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  userId: number;

  @hasMany(() => Dongs, { keyTo: 'accountId' })
  dongs: Dongs[];

  constructor(data?: Partial<Accounts>) {
    super(data);
  }
}

export interface AccountsRelations {
  // describe navigational properties here
}

export type AccountsWithRelations = Accounts & AccountsRelations;
