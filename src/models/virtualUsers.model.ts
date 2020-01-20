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
  _id: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
  })
  phone: string;

  @property({
    type: 'string',
    required: true,
  })
  avatar: string;

  @belongsTo(() => Users)
  usersId: typeof Users.prototype.getId;

  @hasMany(() => Dongs)
  dongs: typeof Dongs.prototype.getId;

  constructor(data?: Partial<VirtualUsers>) {
    super(data);
  }
}

export interface VirtualUsersRelations {
  users?: UsersWithRelations;
  dongs?: DongsWithRelations;
}

export type VirtualUsersWithRelations = VirtualUsers & VirtualUsersRelations;
