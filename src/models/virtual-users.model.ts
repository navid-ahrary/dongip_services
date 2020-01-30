import { Entity, model, property, belongsTo, hasMany } from '@loopback/repository';
import { Users, UsersWithRelations } from './users.model';
import { DongsWithRelations, Dongs } from './dongs.model';

@model()
export class VirtualUsers extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    required: false,
  })
  _key: string;

  @property({
    type: 'string',
    required: false,
    generated: true
  })
  _id: string;

  @property({
    type: 'string',
    required: false,
    generated: true
  })
  _rev: string;

  @property({
    type: 'string',
    required: true,
  })
  phone: string;

  @belongsTo(() => Users)
  usersId: typeof Users.prototype._key;

  @hasMany(() => Dongs)
  dongs: typeof Dongs.prototype._key;

  constructor(data?: Partial<VirtualUsers>) {
    super(data);
  }
}

export interface VirtualUsersRelations {
  users?: UsersWithRelations;
  dongs?: DongsWithRelations;
}

export type VirtualUsersWithRelations = VirtualUsers & VirtualUsersRelations;
