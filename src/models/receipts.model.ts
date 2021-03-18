import { Entity, model, property, belongsTo, RelationType } from '@loopback/repository';
import { Users } from './users.model';
import { Dongs } from './dongs.model';

@model({
  name: 'receipts',
  settings: {
    foreignKeys: {
      fkReceiptsUserId: {
        name: 'fk_receipts_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      fkReceiptsDongId: {
        name: 'fk_receipts_dong_id',
        entity: 'dongs',
        entityKey: 'id',
        foreignKey: 'dongId',
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
    },
  },
})
export class Receipts extends Entity {
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
  receiptId: number;

  @property({
    type: 'string',
    required: true,
    mysql: {
      columnName: 'file_name',
      dataType: 'varchar',
      dataLength: 40,
      nullable: 'N',
    },
  })
  fileName: string;

  @belongsTo(
    () => Users,
    {
      name: 'user',
      keyFrom: 'userId',
      keyTo: 'userId',
      type: RelationType.belongsTo,
      source: Users,
      target: () => Receipts,
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

  constructor(data?: Partial<Receipts>) {
    super(data);
  }
}

export interface ReceiptsRelations {
  // describe navigational properties here
}

export type ReceiptionsWithRelats = Receipts & ReceiptsRelations;
