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
        onDelete: 'set null',
      },
      fkReceiptsDongId: {
        name: 'fk_receipts_dong_id',
        entity: 'dongs',
        entityKey: 'id',
        foreignKey: 'dongId',
        onUpdate: 'cascade',
        onDelete: 'set null',
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
      columnName: 'receipt_name',
      dataType: 'varchar',
      dataLength: 40,
      nullable: 'N',
    },
  })
  receiptName: string;

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
      required: false,
      index: { normal: true },
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        nullable: 'Y',
      },
    },
  )
  userId?: number;

  @belongsTo(
    () => Dongs,
    {
      name: 'dong',
      keyFrom: 'dongId',
      keyTo: 'dongId',
      type: RelationType.belongsTo,
      source: Dongs,
      target: () => Receipts,
      targetsMany: false,
    },
    {
      type: 'number',
      required: false,
      index: { unique: true },
      mysql: {
        columnName: 'dong_id',
        dataType: 'mediumint unsigned',
        dataLength: null,
        nullable: 'Y',
      },
    },
  )
  dongId?: number;

  constructor(data?: Partial<Receipts>) {
    super(data);
  }
}

export interface ReceiptsRelations {
  // describe navigational properties here
}

export type ReceiptionsWithRelats = Receipts & ReceiptsRelations;
