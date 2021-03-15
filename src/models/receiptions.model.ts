import { Entity, model, property, belongsTo, RelationType } from '@loopback/repository';
import { Users } from './users.model';
import { Dongs } from './dongs.model';

@model({
  name: 'receiptions',
  settings: {
    foreignKeys: {
      fkReceiptionsUserId: {
        name: 'fk_receiptions_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkReceiptionsDongId: {
        name: 'fk_receiptions_dong_id',
        entity: 'dongs',
        entityKey: 'id',
        foreignKey: 'dongId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class Receiptions extends Entity {
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
  receiptionId: number;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'filename',
      dataType: 'varchar',
      dataLength: 40,
      nullable: 'N',
    },
  })
  filename: string;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      type: RelationType.belongsTo,
      source: Users,
      target: () => Receiptions,
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

  @belongsTo(
    () => Dongs,
    {},
    {
      type: 'number',
      required: true,
      index: { unique: true },
      mysql: {
        columnName: 'dong_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  dongId: number;

  constructor(data?: Partial<Receiptions>) {
    super(data);
  }
}

export interface ReceiptionsRelations {
  // describe navigational properties here
}

export type ReceiptionsWithRelations = Receiptions & ReceiptionsRelations;
